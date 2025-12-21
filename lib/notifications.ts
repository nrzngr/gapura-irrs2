/**
 * Notification Utilities
 * Placeholder for future webhook/email integration
 * 
 * Trade-offs: Currently logs only - production should integrate with:
 * - Email service (SendGrid, AWS SES)
 * - Webhook (n8n, Zapier)
 * - Push notifications
 * 
 * Complexity: Time O(1) | Space O(1)
 */

interface NotificationPayload {
    type: 'NEW_REPORT' | 'STATUS_CHANGE' | 'SLA_BREACH' | 'COMMENT';
    reportId: string;
    targetDivision?: string;
    title: string;
    message: string;
    priority?: string;
    slaDeadline?: string;
}

/**
 * Send notification to relevant parties
 * TODO: Implement actual webhook/email in production
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
    // Log for debugging/audit
    console.log('[NOTIFICATION]', JSON.stringify(payload, null, 2));
    
    // TODO: Integrate with notification service
    // Example webhook call:
    // if (process.env.NOTIFICATION_WEBHOOK_URL) {
    //     await fetch(process.env.NOTIFICATION_WEBHOOK_URL, {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify(payload),
    //     });
    // }
}

/**
 * Notify Partner when new report is assigned to their division
 */
export async function notifyNewReport(
    reportId: string,
    targetDivision: string,
    title: string,
    priority: string,
    slaDeadline: string
): Promise<void> {
    await sendNotification({
        type: 'NEW_REPORT',
        reportId,
        targetDivision,
        title,
        message: `Laporan baru masuk untuk divisi ${targetDivision}`,
        priority,
        slaDeadline,
    });
}

/**
 * Notify when SLA is breached
 */
export async function notifySLABreach(
    reportId: string,
    title: string,
    hoursOverdue: number
): Promise<void> {
    await sendNotification({
        type: 'SLA_BREACH',
        reportId,
        title,
        message: `SLA terlewati ${hoursOverdue} jam untuk laporan: ${title}`,
    });
}

/**
 * Notify status change
 */
export async function notifyStatusChange(
    reportId: string,
    title: string,
    oldStatus: string,
    newStatus: string
): Promise<void> {
    await sendNotification({
        type: 'STATUS_CHANGE',
        reportId,
        title,
        message: `Status berubah dari ${oldStatus} ke ${newStatus}`,
    });
}
