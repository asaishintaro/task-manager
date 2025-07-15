import { checkDueTasks, sendNotification } from './taskService'

class NotificationService {
  constructor() {
    this.checkInterval = null
    this.isActive = false
  }

  // 定期チェックを開始
  startPeriodicCheck(tasks) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    // 1時間ごとに期限チェック (テスト用: 5分)
    this.checkInterval = setInterval(() => {
      this.checkAndNotify(tasks)
    }, 5 * 60 * 1000) // テスト用: 5分ごと

    this.isActive = true
    console.log('定期チェックを開始しました (1時間ごと)')
  }

  // 定期チェックを停止
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
      this.isActive = false
      console.log('定期チェックを停止しました')
    }
  }

  // 期限チェックと通知
  checkAndNotify(tasks) {
    const { overdueTasks, todayTasks } = checkDueTasks(tasks)
    
    if (overdueTasks.length > 0) {
      sendNotification(
        '期限切れのタスクがあります！',
        `${overdueTasks.length}件のタスクが期限切れです。確認してください。`
      )
    }
    
    if (todayTasks.length > 0) {
      sendNotification(
        '今日が期限のタスクがあります',
        `${todayTasks.length}件のタスクが今日期限です。お忘れなく！`
      )
    }
  }

  // 特定時間の通知 (朝9時)
  scheduleMorningNotification(tasks) {
    const now = new Date()
    const morningTime = new Date()
    morningTime.setHours(9, 0, 0, 0)
    
    // 今日の9時を過ぎていれば明日の9時に設定
    if (now >= morningTime) {
      morningTime.setDate(morningTime.getDate() + 1)
    }
    
    const timeUntilMorning = morningTime.getTime() - now.getTime()
    
    setTimeout(() => {
      this.sendMorningNotification(tasks)
      // 24時間後に再度設定
      this.scheduleMorningNotification(tasks)
    }, timeUntilMorning)
  }

  // 朝の通知
  sendMorningNotification(tasks) {
    const { overdueTasks, todayTasks } = checkDueTasks(tasks)
    
    if (overdueTasks.length > 0 || todayTasks.length > 0) {
      sendNotification(
        'おはようございます！',
        `今日の予定: 期限切れ ${overdueTasks.length}件、今日期限 ${todayTasks.length}件`
      )
    }
  }

  // ページが非アクティブになった時の処理
  handleVisibilityChange(tasks) {
    if (document.hidden) {
      // ページが非表示になった時に定期チェックを開始
      this.startPeriodicCheck(tasks)
    } else {
      // ページが表示された時に定期チェックを停止
      this.stopPeriodicCheck()
    }
  }
}

export default new NotificationService()