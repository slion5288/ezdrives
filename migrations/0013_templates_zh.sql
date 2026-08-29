-- EZDRIVES — 0013: Chinese-only template content (subject_zh/body_zh)
-- Adds per-template Chinese fields and rewrites the bilingual subject /
-- html_body / text_body (EN auto-translated via the site's chain).
ALTER TABLE notification_templates ADD COLUMN subject_zh TEXT DEFAULT '';
ALTER TABLE notification_templates ADD COLUMN body_zh TEXT DEFAULT '';

UPDATE notification_templates SET subject_zh = '账号信息已更新', body_zh = '{{student_name}}，您的账号信息已更新。若非本人操作，请及时联系教练：{{instructor_phone}}。', subject = 'Account info updated / 账号信息已更新', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Account info updated</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your account information has been updated. If not, please reach out to your instructor: {{instructor_phone}}.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">账号信息已更新</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您的账号信息已更新。若非本人操作，请及时联系教练：{{instructor_phone}}。</div></div>', text_body = 'Account info updated

{{student_name}}, your account information has been updated. If not, please reach out to your instructor: {{instructor_phone}}.

---

账号信息已更新
{{student_name}}，您的账号信息已更新。若非本人操作，请及时联系教练：{{instructor_phone}}。', updated_at = '' WHERE type = 'ACCOUNT_UPDATED';
UPDATE notification_templates SET subject_zh = '预约已取消', body_zh = '{{student_name}}，您的{{course_name}}课程（{{booking_date}} {{booking_time}}）已取消。如需重新预约，请登录网站操作。', subject = 'Appointment canceled / 预约已取消', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Appointment canceled</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your course {{course_name}} on {{booking_date}} at {{booking_time}} has been canceled. To reschedule, please log in to the website.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">预约已取消</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您的{{course_name}}课程（{{booking_date}} {{booking_time}}）已取消。如需重新预约，请登录网站操作。</div></div>', text_body = 'Appointment canceled

{{student_name}}, your course {{course_name}} on {{booking_date}} at {{booking_time}} has been canceled. To reschedule, please log in to the website.

---

预约已取消
{{student_name}}，您的{{course_name}}课程（{{booking_date}} {{booking_time}}）已取消。如需重新预约，请登录网站操作。', updated_at = '' WHERE type = 'BOOKING_CANCELLED';
UPDATE notification_templates SET subject_zh = '预约已确认', body_zh = '{{student_name}}，您好！您已成功预约{{course_name}}课程。时间：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）；接送地点：{{booking_location}}。如需取消或改期，请在课程开始前至少 24 小时操作。', subject = 'Appointment Confirmed / 预约已确认', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Appointment Confirmed</h2><div style="font-size:15px;line-height:1.7">Hi {{student_name}}, You have successfully booked a course for {{course_name}}. Time: {{booking_date}} {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}); pickup location: {{booking_location}}. If you need to cancel or reschedule, please do so at least 24 hours before the start of the course.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">预约已确认</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您好！您已成功预约{{course_name}}课程。时间：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）；接送地点：{{booking_location}}。如需取消或改期，请在课程开始前至少 24 小时操作。</div></div>', text_body = 'Appointment Confirmed

Hi {{student_name}}, You have successfully booked a course for {{course_name}}. Time: {{booking_date}} {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}); pickup location: {{booking_location}}. If you need to cancel or reschedule, please do so at least 24 hours before the start of the course.

---

预约已确认
{{student_name}}，您好！您已成功预约{{course_name}}课程。时间：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）；接送地点：{{booking_location}}。如需取消或改期，请在课程开始前至少 24 小时操作。', updated_at = '' WHERE type = 'BOOKING_CONFIRMED';
UPDATE notification_templates SET subject_zh = '上课提醒', body_zh = '{{student_name}}，您的{{course_name}}课程将于 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）开始，接送地点：{{booking_location}}。到时见！', subject = 'Class Reminders / 上课提醒', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Class Reminders</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your {{course_name}} course will start on {{booking_date}} at {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}) from {{booking_location}}. See you soon!</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">上课提醒</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您的{{course_name}}课程将于 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）开始，接送地点：{{booking_location}}。到时见！</div></div>', text_body = 'Class Reminders

{{student_name}}, your {{course_name}} course will start on {{booking_date}} at {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}) from {{booking_location}}. See you soon!

---

上课提醒
{{student_name}}，您的{{course_name}}课程将于 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）开始，接送地点：{{booking_location}}。到时见！', updated_at = '' WHERE type = 'BOOKING_REMINDER';
UPDATE notification_templates SET subject_zh = '预约已改期', body_zh = '{{student_name}}，您的{{course_name}}课程已改期至 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）。', subject = 'Appointment rescheduled / 预约已改期', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Appointment rescheduled</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your course {{course_name}} has been rescheduled to {{booking_date}} at {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}).</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">预约已改期</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您的{{course_name}}课程已改期至 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）。</div></div>', text_body = 'Appointment rescheduled

{{student_name}}, your course {{course_name}} has been rescheduled to {{booking_date}} at {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}).

---

预约已改期
{{student_name}}，您的{{course_name}}课程已改期至 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）。', updated_at = '' WHERE type = 'BOOKING_RESCHEDULED';
UPDATE notification_templates SET subject_zh = '现金支付已批准', body_zh = '{{student_name}}，教练已批准您的现金支付。您现在可以预约第一节课；教练收到现金后其余课程将解锁。', subject = 'Cash payment approved / 现金支付已批准', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Cash payment approved</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your cash payment has been approved by your coach. You can now book your first lesson; the remaining lessons will be unlocked once the coach receives the cash.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">现金支付已批准</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，教练已批准您的现金支付。您现在可以预约第一节课；教练收到现金后其余课程将解锁。</div></div>', text_body = 'Cash payment approved

{{student_name}}, your cash payment has been approved by your coach. You can now book your first lesson; the remaining lessons will be unlocked once the coach receives the cash.

---

现金支付已批准
{{student_name}}，教练已批准您的现金支付。您现在可以预约第一节课；教练收到现金后其余课程将解锁。', updated_at = '' WHERE type = 'CASH_APPROVED';
UPDATE notification_templates SET subject_zh = '已收到现金支付', body_zh = '{{student_name}}，教练已收到您的现金支付（收款时间：{{payment_received_at}}，经手人：{{payment_received_by}}）。所有课程现已解锁。', subject = 'Cash payment received / 已收到现金支付', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Cash payment received</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your coach has received your cash payment at {{payment_received_at}} handled by {{payment_received_by}}. All courses are now unlocked.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">已收到现金支付</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，教练已收到您的现金支付（收款时间：{{payment_received_at}}，经手人：{{payment_received_by}}）。所有课程现已解锁。</div></div>', text_body = 'Cash payment received

{{student_name}}, your coach has received your cash payment at {{payment_received_at}} handled by {{payment_received_by}}. All courses are now unlocked.

---

已收到现金支付
{{student_name}}，教练已收到您的现金支付（收款时间：{{payment_received_at}}，经手人：{{payment_received_by}}）。所有课程现已解锁。', updated_at = '' WHERE type = 'CASH_RECEIVED';
UPDATE notification_templates SET subject_zh = '现金支付提醒', body_zh = '{{student_name}}，您还有一笔未完成的现金支付（{{course_name}}，{{final_price}} CAD）。请尽快与教练完成付款，付款后即可预约课程。', subject = 'Cash payment reminder / 现金支付提醒', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Cash payment reminder</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, you have an outstanding cash payment ({{course_name}}, {{final_price}} CAD). Please complete the payment with your instructor as soon as possible and book a lesson after payment.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">现金支付提醒</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您还有一笔未完成的现金支付（{{course_name}}，{{final_price}} CAD）。请尽快与教练完成付款，付款后即可预约课程。</div></div>', text_body = 'Cash payment reminder

{{student_name}}, you have an outstanding cash payment ({{course_name}}, {{final_price}} CAD). Please complete the payment with your instructor as soon as possible and book a lesson after payment.

---

现金支付提醒
{{student_name}}，您还有一笔未完成的现金支付（{{course_name}}，{{final_price}} CAD）。请尽快与教练完成付款，付款后即可预约课程。', updated_at = '' WHERE type = 'CASH_REMINDER';
UPDATE notification_templates SET subject_zh = '新的现金支付申请', body_zh = '{{student_name}} 申请以现金支付{{course_name}}（{{final_price}} CAD）。请核对后确认收款。', subject = 'New cash request / 新的现金支付申请', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">New cash request</h2><div style="font-size:15px;line-height:1.7">{{student_name}} applied to pay {{course_name}} ({{final_price}} CAD) in cash. Please review and confirm your payout.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">新的现金支付申请</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 申请以现金支付{{course_name}}（{{final_price}} CAD）。请核对后确认收款。</div></div>', text_body = 'New cash request

{{student_name}} applied to pay {{course_name}} ({{final_price}} CAD) in cash. Please review and confirm your payout.

---

新的现金支付申请
{{student_name}} 申请以现金支付{{course_name}}（{{final_price}} CAD）。请核对后确认收款。', updated_at = '' WHERE type = 'CASH_REQUEST';
UPDATE notification_templates SET subject_zh = '今日课表', body_zh = '{{instructor_name}}，以下是今天的课程安排：
{{schedule_summary}}
祝教学顺利！', subject = 'Today''s Schedule / 今日课表', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Today''s Schedule</h2><div style="font-size:15px;line-height:1.7">{{instructor_name}}, here''s the schedule for today:<br/>{{schedule_summary}}<br/>Good luck with your teaching!</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">今日课表</h2><div style="font-size:15px;line-height:1.7">{{instructor_name}}，以下是今天的课程安排：<br/>{{schedule_summary}}<br/>祝教学顺利！</div></div>', text_body = 'Today''s Schedule

{{instructor_name}}, here''s the schedule for today:
{{schedule_summary}}
Good luck with your teaching!

---

今日课表
{{instructor_name}}，以下是今天的课程安排：
{{schedule_summary}}
祝教学顺利！', updated_at = '' WHERE type = 'DAILY_SCHEDULE';
UPDATE notification_templates SET subject_zh = '学员证件已上传', body_zh = '{{student_name}} 已上传驾照正反面照片。请登录审核。', subject = 'Learner ID uploaded / 学员证件已上传', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Learner ID uploaded</h2><div style="font-size:15px;line-height:1.7">{{student_name}} uploaded a photo of the front and back of their driver''s license. Please login for review.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">学员证件已上传</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 已上传驾照正反面照片。请登录审核。</div></div>', text_body = 'Learner ID uploaded

{{student_name}} uploaded a photo of the front and back of their driver''s license. Please login for review.

---

学员证件已上传
{{student_name}} 已上传驾照正反面照片。请登录审核。', updated_at = '' WHERE type = 'DOCUMENT_UPLOADED';
UPDATE notification_templates SET subject_zh = 'EMT 转账已确认', body_zh = '{{student_name}}，教练已收到您的 e-Transfer（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。', subject = 'EMT Transfer Confirmed / EMT 转账已确认', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">EMT Transfer Confirmed</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, Instructor has received your e-Transfer ({{course_name}}, {{final_price}} CAD, payout time: {{payment_received_at}}). All courses are now unlocked.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">EMT 转账已确认</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，教练已收到您的 e-Transfer（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。</div></div>', text_body = 'EMT Transfer Confirmed

{{student_name}}, Instructor has received your e-Transfer ({{course_name}}, {{final_price}} CAD, payout time: {{payment_received_at}}). All courses are now unlocked.

---

EMT 转账已确认
{{student_name}}，教练已收到您的 e-Transfer（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。', updated_at = '' WHERE type = 'EMT_CONFIRMED';
UPDATE notification_templates SET subject_zh = '新的 EMT 转账待确认', body_zh = '{{student_name}} 提交了对{{course_name}}的 Interac e-Transfer（{{final_price}} CAD）。收到款项后请确认收款。', subject = 'New EMT transfer pending confirmation / 新的 EMT 转账待确认', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">New EMT transfer pending confirmation</h2><div style="font-size:15px;line-height:1.7">{{student_name}} submitted Interac e-Transfer ({{final_price}} CAD) for {{course_name}}. Once you''ve received your payout, please confirm it.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">新的 EMT 转账待确认</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 提交了对{{course_name}}的 Interac e-Transfer（{{final_price}} CAD）。收到款项后请确认收款。</div></div>', text_body = 'New EMT transfer pending confirmation

{{student_name}} submitted Interac e-Transfer ({{final_price}} CAD) for {{course_name}}. Once you''ve received your payout, please confirm it.

---

新的 EMT 转账待确认
{{student_name}} 提交了对{{course_name}}的 Interac e-Transfer（{{final_price}} CAD）。收到款项后请确认收款。', updated_at = '' WHERE type = 'EMT_REQUEST';
UPDATE notification_templates SET subject_zh = '重要账号通知', body_zh = '您的账号有重要变更，请尽快登录查看详情。', subject = 'Important account notification / 重要账号通知', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Important account notification</h2><div style="font-size:15px;line-height:1.7">There are important changes to your account, please log in as soon as possible to review the details.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">重要账号通知</h2><div style="font-size:15px;line-height:1.7">您的账号有重要变更，请尽快登录查看详情。</div></div>', text_body = 'Important account notification

There are important changes to your account, please log in as soon as possible to review the details.

---

重要账号通知
您的账号有重要变更，请尽快登录查看详情。', updated_at = '' WHERE type = 'IMPORTANT_ACCOUNT';
UPDATE notification_templates SET subject_zh = '学员取消预约', body_zh = '{{student_name}} 取消了{{course_name}}（{{booking_date}} {{booking_time}}）的预约。', subject = 'Learner Cancels Appointment / 学员取消预约', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Learner Cancels Appointment</h2><div style="font-size:15px;line-height:1.7">{{student_name}} canceled their appointment with {{course_name}} on {{booking_date}} at {{booking_time}}.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">学员取消预约</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 取消了{{course_name}}（{{booking_date}} {{booking_time}}）的预约。</div></div>', text_body = 'Learner Cancels Appointment

{{student_name}} canceled their appointment with {{course_name}} on {{booking_date}} at {{booking_time}}.

---

学员取消预约
{{student_name}} 取消了{{course_name}}（{{booking_date}} {{booking_time}}）的预约。', updated_at = '' WHERE type = 'INSTRUCTOR_BOOKING_CANCELLED';
UPDATE notification_templates SET subject_zh = '学员改期预约', body_zh = '{{student_name}} 已将{{course_name}}课程改期至 {{booking_date}} {{booking_time}}。', subject = 'Learner rescheduling / 学员改期预约', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Learner rescheduling</h2><div style="font-size:15px;line-height:1.7">{{student_name}} has rescheduled {{course_name}} to {{booking_date}} at {{booking_time}}.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">学员改期预约</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 已将{{course_name}}课程改期至 {{booking_date}} {{booking_time}}。</div></div>', text_body = 'Learner rescheduling

{{student_name}} has rescheduled {{course_name}} to {{booking_date}} at {{booking_time}}.

---

学员改期预约
{{student_name}} 已将{{course_name}}课程改期至 {{booking_date}} {{booking_time}}。', updated_at = '' WHERE type = 'INSTRUCTOR_BOOKING_RESCHEDULED';
UPDATE notification_templates SET subject_zh = '课时已完成', body_zh = '{{student_name}}，您的{{course_name}}{{lesson_title}}课时已完成。感谢您的学习，继续加油！', subject = 'Lesson Completed / 课时已完成', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Lesson Completed</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your {{course_name}} {{lesson_title}} lesson has been completed. Thank you for studying and keep it up!</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">课时已完成</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您的{{course_name}}{{lesson_title}}课时已完成。感谢您的学习，继续加油！</div></div>', text_body = 'Lesson Completed

{{student_name}}, your {{course_name}} {{lesson_title}} lesson has been completed. Thank you for studying and keep it up!

---

课时已完成
{{student_name}}，您的{{course_name}}{{lesson_title}}课时已完成。感谢您的学习，继续加油！', updated_at = '' WHERE type = 'LESSON_COMPLETED';
UPDATE notification_templates SET subject_zh = '新预约通知', body_zh = '{{student_name}} 预约了{{course_name}}：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}），接送地点：{{booking_location}}。请按时上课。', subject = 'New Appoinment Notification / 新预约通知', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">New Appoinment Notification</h2><div style="font-size:15px;line-height:1.7">{{student_name}} booked {{course_name}} on {{booking_date}} at {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}) from {{booking_location}}. Please come to class on time.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">新预约通知</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 预约了{{course_name}}：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}），接送地点：{{booking_location}}。请按时上课。</div></div>', text_body = 'New Appoinment Notification

{{student_name}} booked {{course_name}} on {{booking_date}} at {{booking_time}} ({{booking_start_time}} – {{booking_end_time}}) from {{booking_location}}. Please come to class on time.

---

新预约通知
{{student_name}} 预约了{{course_name}}：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}），接送地点：{{booking_location}}。请按时上课。', updated_at = '' WHERE type = 'NEW_BOOKING';
UPDATE notification_templates SET subject_zh = '新的课程购买', body_zh = '{{student_name}} 购买了{{course_name}}（{{final_price}} CAD）。请及时确认收款。', subject = 'New Course Purchase / 新的课程购买', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">New Course Purchase</h2><div style="font-size:15px;line-height:1.7">{{student_name}} purchased {{course_name}} ({{final_price}} CAD). Please confirm your payout in a timely manner.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">新的课程购买</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 购买了{{course_name}}（{{final_price}} CAD）。请及时确认收款。</div></div>', text_body = 'New Course Purchase

{{student_name}} purchased {{course_name}} ({{final_price}} CAD). Please confirm your payout in a timely manner.

---

新的课程购买
{{student_name}} 购买了{{course_name}}（{{final_price}} CAD）。请及时确认收款。', updated_at = '' WHERE type = 'NEW_PURCHASE';
UPDATE notification_templates SET subject_zh = '重置密码', body_zh = '您请求重置密码。如非本人操作，请忽略此邮件；如需帮助请联系{{company_name}}：{{company_email}}。', subject = 'Reset Password / 重置密码', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Reset Password</h2><div style="font-size:15px;line-height:1.7">You requested a password reset. Ignore this email if you didn''t do it yourself, or contact {{company_name}} at {{company_email}} for help.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">重置密码</h2><div style="font-size:15px;line-height:1.7">您请求重置密码。如非本人操作，请忽略此邮件；如需帮助请联系{{company_name}}：{{company_email}}。</div></div>', text_body = 'Reset Password

You requested a password reset. Ignore this email if you didn''t do it yourself, or contact {{company_name}} at {{company_email}} for help.

---

重置密码
您请求重置密码。如非本人操作，请忽略此邮件；如需帮助请联系{{company_name}}：{{company_email}}。', updated_at = '' WHERE type = 'PASSWORD_RESET';
UPDATE notification_templates SET subject_zh = '支付被拒绝', body_zh = '{{student_name}}，您对{{course_name}}的支付被拒绝。请重新提交支付或联系教练：{{instructor_phone}}。', subject = 'PAYMENT REJECTED / 支付被拒绝', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">PAYMENT REJECTED</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your payment to {{course_name}} has been declined. Please resubmit the payment or contact the instructor: {{instructor_phone}}.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">支付被拒绝</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您对{{course_name}}的支付被拒绝。请重新提交支付或联系教练：{{instructor_phone}}。</div></div>', text_body = 'PAYMENT REJECTED

{{student_name}}, your payment to {{course_name}} has been declined. Please resubmit the payment or contact the instructor: {{instructor_phone}}.

---

支付被拒绝
{{student_name}}，您对{{course_name}}的支付被拒绝。请重新提交支付或联系教练：{{instructor_phone}}。', updated_at = '' WHERE type = 'PAYMENT_REJECTED';
UPDATE notification_templates SET subject_zh = '手机号已验证', body_zh = '{{student_name}}，您的手机号验证成功。', subject = 'Phone number verified / 手机号已验证', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Phone number verified</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your phone number was successfully verified.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">手机号已验证</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您的手机号验证成功。</div></div>', text_body = 'Phone number verified

{{student_name}}, your phone number was successfully verified.

---

手机号已验证
{{student_name}}，您的手机号验证成功。', updated_at = '' WHERE type = 'PHONE_VERIFIED';
UPDATE notification_templates SET subject_zh = '购买成功', body_zh = '{{student_name}}，您购买的{{course_name}}（{{final_price}} CAD）已确认。现在可以预约课程时间了。', subject = 'Successfully Bought / 购买成功', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Successfully Bought</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your purchase of {{course_name}} ({{final_price}} CAD) has been confirmed. You can now schedule a lesson.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">购买成功</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您购买的{{course_name}}（{{final_price}} CAD）已确认。现在可以预约课程时间了。</div></div>', text_body = 'Successfully Bought

{{student_name}}, your purchase of {{course_name}} ({{final_price}} CAD) has been confirmed. You can now schedule a lesson.

---

购买成功
{{student_name}}，您购买的{{course_name}}（{{final_price}} CAD）已确认。现在可以预约课程时间了。', updated_at = '' WHERE type = 'PURCHASE_CONFIRMED';
UPDATE notification_templates SET subject_zh = '课程安排变更', body_zh = '{{student_name}}，您的{{course_name}}课程安排有变更，请登录查看最新安排。', subject = 'Curriculum Changes / 课程安排变更', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Curriculum Changes</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, your {{course_name}} schedule has changed, please log in to check the latest schedule.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">课程安排变更</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您的{{course_name}}课程安排有变更，请登录查看最新安排。</div></div>', text_body = 'Curriculum Changes

{{student_name}}, your {{course_name}} schedule has changed, please log in to check the latest schedule.

---

课程安排变更
{{student_name}}，您的{{course_name}}课程安排有变更，请登录查看最新安排。', updated_at = '' WHERE type = 'SCHEDULE_UPDATE';
UPDATE notification_templates SET subject_zh = '欢迎加入 EZDRIVES', body_zh = '{{student_name}}，欢迎注册 EZDRIVES 驾驶学院！您的账号已创建，现在可以浏览课程、购买并预约时间。', subject = 'Welcome TO EZDRIVES / 欢迎加入 EZDRIVES', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">Welcome TO EZDRIVES</h2><div style="font-size:15px;line-height:1.7">Welcome to EZDRIVES, {{student_name}}! Your account has been created and you can now browse courses, buy and book times.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">欢迎加入 EZDRIVES</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，欢迎注册 EZDRIVES 驾驶学院！您的账号已创建，现在可以浏览课程、购买并预约时间。</div></div>', text_body = 'Welcome TO EZDRIVES

Welcome to EZDRIVES, {{student_name}}! Your account has been created and you can now browse courses, buy and book times.

---

欢迎加入 EZDRIVES
{{student_name}}，欢迎注册 EZDRIVES 驾驶学院！您的账号已创建，现在可以浏览课程、购买并预约时间。', updated_at = '' WHERE type = 'STUDENT_REGISTERED';
UPDATE notification_templates SET subject_zh = '系统通知', body_zh = '{{student_name}}，您有一条新的系统通知，请登录网站查看。', subject = 'System notifications / 系统通知', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">System notifications</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, you have a new system notification, please check the website.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">系统通知</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，您有一条新的系统通知，请登录网站查看。</div></div>', text_body = 'System notifications

{{student_name}}, you have a new system notification, please check the website.

---

系统通知
{{student_name}}，您有一条新的系统通知，请登录网站查看。', updated_at = '' WHERE type = 'SYSTEM_NOTIFICATION';
UPDATE notification_templates SET subject_zh = '微信支付已确认', body_zh = '{{student_name}}，教练已收到您的微信支付（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。', subject = 'WeChat Pay confirmed / 微信支付已确认', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">WeChat Pay confirmed</h2><div style="font-size:15px;line-height:1.7">{{student_name}}, Instructor has received your WeChat payment ({{course_name}}, {{final_price}} CAD, payout time: {{payment_received_at}}). All courses are now unlocked.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">微信支付已确认</h2><div style="font-size:15px;line-height:1.7">{{student_name}}，教练已收到您的微信支付（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。</div></div>', text_body = 'WeChat Pay confirmed

{{student_name}}, Instructor has received your WeChat payment ({{course_name}}, {{final_price}} CAD, payout time: {{payment_received_at}}). All courses are now unlocked.

---

微信支付已确认
{{student_name}}，教练已收到您的微信支付（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。', updated_at = '' WHERE type = 'WECHAT_CONFIRMED';
UPDATE notification_templates SET subject_zh = '新的微信支付待确认', body_zh = '{{student_name}} 提交了对{{course_name}}的微信支付（{{final_price}} CAD，约{{payment_amount_cny}}）。收到款项后请确认收款。', subject = 'New WeChat Payment Pending Confirmation / 新的微信支付待确认', html_body = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917"><h2 style="color:#A21CAF;margin:0 0 12px">New WeChat Payment Pending Confirmation</h2><div style="font-size:15px;line-height:1.7">{{student_name}} submitted a WeChat payment ({{final_price}} CAD, about {{payment_amount_cny}}) to {{course_name}}. Once you''ve received your payout, please confirm it.</div><hr style="border:none;border-top:1px solid #E5DFD5;margin:20px 0"/><h2 style="color:#A21CAF;margin:0 0 12px">新的微信支付待确认</h2><div style="font-size:15px;line-height:1.7">{{student_name}} 提交了对{{course_name}}的微信支付（{{final_price}} CAD，约{{payment_amount_cny}}）。收到款项后请确认收款。</div></div>', text_body = 'New WeChat Payment Pending Confirmation

{{student_name}} submitted a WeChat payment ({{final_price}} CAD, about {{payment_amount_cny}}) to {{course_name}}. Once you''ve received your payout, please confirm it.

---

新的微信支付待确认
{{student_name}} 提交了对{{course_name}}的微信支付（{{final_price}} CAD，约{{payment_amount_cny}}）。收到款项后请确认收款。', updated_at = '' WHERE type = 'WECHAT_REQUEST';
