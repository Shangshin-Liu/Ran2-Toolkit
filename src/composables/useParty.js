import { ref } from 'vue'
import { db, messaging } from '@/firebase.js'
import { doc, updateDoc, setDoc, deleteDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore'
import { getToken } from 'firebase/messaging'

export const MAX_PARTY_MEMBERS = 8

/**
 * 根據時間與當前狀態動態推算最精確的有效狀態，避免頻繁寫入資料庫
 */
export const getEffectiveStatus = (party) => {
  if (!party) return ''
  const now = Date.now()
  if (party.status === '已關閉' || party.status === '已結束') return party.status
  if (now >= party.endTime) return '已結束'
  if (now >= party.startTime) return '進行中'
  return party.status || '招募中'
}

/**
 * 統一成員計數邏輯 (優先讀取 memberCharIds 陣列長度，解決雙軌漂移 P10)
 */
export const getMemberCount = (party) => {
  if (!party) return 0
  if (Array.isArray(party.memberCharIds)) {
    return party.memberCharIds.length
  }
  return party.expectedCount || 0
}

/**
 * 判斷當前登入角色是否已參加該團
 */
export const isPartyJoined = (party, currentUser) => {
  if (!party || !currentUser || !currentUser.charId) return false
  return Array.isArray(party.memberCharIds) && party.memberCharIds.includes(currentUser.charId)
}

/**
 * 取得 FCM 推播 Token (整合權限檢查、防驚擾與快取寫入 P7)
 */
export const getFcmToken = async (showToast = null) => {
  try {
    if (!('Notification' in window)) {
      console.warn("此瀏覽器不支援通知功能。")
      return null
    }

    // 若已被封鎖，直接跳過不驚擾
    if (Notification.permission === 'denied') {
      console.log("FCM 通知權限已遭封鎖，跳過請求。")
      return null
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        if (showToast) showToast("接收開團提醒需要啟用通知權限！")
        return null
      }
    }

    if (!messaging) return null

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
    })

    if (token) {
      localStorage.setItem('ran2_fcm_token', token) // P7 對稱快取
    }
    return token
  } catch (err) {
    console.error("取得 FCM Token 失敗：", err)
    return null
  }
}

export function useParty() {
  const isActionLoading = ref(false)

  /**
   * 統一的加入/退出練功團邏輯 (包含伺服器校驗、團長校驗、人數上限 P25)
   */
  const handleToggleSubscribe = async ({ party, currentUser, localSubscribedIds, showToast }) => {
    if (!party) return
    const currentStatus = getEffectiveStatus(party)
    if (currentStatus === '已結束' || currentStatus === '已關閉') {
      if (showToast) showToast('此招募團已結束或關閉，無法操作！')
      return
    }

    if (!currentUser || !currentUser.charId) {
      if (showToast) showToast('請先登入後再進行此操作！')
      return
    }

    // 1. 伺服器校驗
    if (currentUser.server !== party.server) {
      alert(`伺服器不匹配！您的角色在「${currentUser.server}」，無法加入「${party.server}」的練功團。`)
      return
    }

    // 2. 發起人不可跟團校驗
    if (
      currentUser.charId === party.leaderId || 
      (currentUser.codeHash && party.creatorHash && currentUser.codeHash === party.creatorHash)
    ) {
      alert('您是此招募團的發起人，無法參加自己發起的團！')
      return
    }

    const docRef = doc(db, 'parties', party.id)
    const isSubbed = isPartyJoined(party, currentUser) || (localSubscribedIds && localSubscribedIds.value.includes(party.id))

    // 3. 人數上限檢查 (上限 8 人 P25)
    if (!isSubbed && getMemberCount(party) >= MAX_PARTY_MEMBERS) {
      alert(`此練功團名額已滿（上限 ${MAX_PARTY_MEMBERS} 人），無法再加入！`)
      return
    }

    isActionLoading.value = true
    try {
      if (!isSubbed) {
        // --- 參加跟團 ---
        const token = await getFcmToken(showToast)
        if (token) {
          const subId = `${token}_${party.id}`
          await setDoc(doc(db, 'party_subscriptions', subId), {
            token: token,
            partyId: party.id,
            createdAt: Date.now()
          })
        }

        if (localSubscribedIds && !localSubscribedIds.value.includes(party.id)) {
          localSubscribedIds.value.push(party.id)
          localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
        }

        await updateDoc(docRef, {
          memberCharIds: arrayUnion(currentUser.charId),
          expectedCount: increment(1)
        })

        if (showToast) showToast(`參加成功！${token ? '開團前將通知您。' : ''}`)
      } else {
        // --- 取消跟團 ---
        const token = localStorage.getItem('ran2_fcm_token') || await getFcmToken(showToast)
        if (token) {
          const subId = `${token}_${party.id}`
          await deleteDoc(doc(db, 'party_subscriptions', subId))
        }

        if (localSubscribedIds) {
          localSubscribedIds.value = localSubscribedIds.value.filter(id => id !== party.id)
          localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
        }

        await updateDoc(docRef, {
          memberCharIds: arrayRemove(currentUser.charId),
          expectedCount: increment(-1)
        })

        if (showToast) showToast('已取消參加此團。')
      }
    } catch (err) {
      console.error("跟團/取消操作失敗：", err)
      if (showToast) showToast("操作失敗，請檢查網路連線！")
    } finally {
      isActionLoading.value = false
    }
  }

  /**
   * 安全取消/關閉招募團 (配合 allow delete: if false 的軟刪除)
   */
  const handleCloseParty = async ({ partyId, closeReason = '發起人手動取消招募', localSubscribedIds, showToast }) => {
    if (!partyId) return
    isActionLoading.value = true
    try {
      const docRef = doc(db, 'parties', partyId)
      await updateDoc(docRef, {
        status: '已關閉',
        closeReason: closeReason
      })

      if (localSubscribedIds) {
        localSubscribedIds.value = localSubscribedIds.value.filter(id => id !== partyId)
        localStorage.setItem('ran2_subscribed_party_ids', JSON.stringify(localSubscribedIds.value))
      }

      if (showToast) showToast('招募已成功取消關閉！')
      return true
    } catch (err) {
      console.error("關閉招募失敗：", err)
      if (showToast) showToast("關閉招募失敗，請稍後再試！")
      return false
    } finally {
      isActionLoading.value = false
    }
  }

  return {
    isActionLoading,
    handleToggleSubscribe,
    handleCloseParty,
    getEffectiveStatus,
    getMemberCount,
    isPartyJoined,
    getFcmToken,
    MAX_PARTY_MEMBERS
  }
}
