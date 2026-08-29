-- ============================================================================
-- EZDRIVES — 0012: DAILY_SCHEDULE email template (cron daily schedule)
-- Sent to the instructor each morning (America/Toronto) with today's lesson
-- list. Uses the {{schedule_summary}} variable (added to the whitelist).
-- ============================================================================

INSERT OR REPLACE INTO notification_templates (id, type, name, subject, html_body, text_body, enabled, is_system, updated_at) VALUES
('tpl_daily_schedule', 'DAILY_SCHEDULE', 'Daily Schedule', 'Today''s Schedule / 今日课表',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#0F5C4C">Today''s Schedule / 今日课表</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{instructor_name}},</p><p>Here is your schedule for today:</p><p>以下是今天的课程安排：</p><pre style="white-space:pre-wrap;background:#F4F1EC;padding:14px;border-radius:8px;font-size:13px">{{schedule_summary}}</pre><p>Have a great day of teaching!</p><p>祝教学顺利！</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>',
 'Today''s Schedule / 今日课表

Hi {{instructor_name}},

Here is your schedule for today: / 以下是今天的课程安排：

{{schedule_summary}}

Have a great day of teaching! / 祝教学顺利！

— EZDRIVES',
 1, 1, '');
