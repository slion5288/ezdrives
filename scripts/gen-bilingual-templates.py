#!/usr/bin/env python3
# Generates migrations/0009_bilingual_templates.sql — all email templates
# become bilingual (English + 中文). Content mirrors the current templates
# (same {{variables}}), each with an EN block then a ZH block.

TPL = [
  # (id, type, name, subject, html, text)
  ("tpl_welcome", "STUDENT_REGISTERED", "Student Welcome",
   "Welcome to EZDRIVES, {{student_name}}! / 欢迎加入 EZDRIVES，{{student_name}}！",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Welcome / 欢迎加入</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your account has been created successfully. Your phone number has been verified.</p><p>Important account, booking, schedule and reminder notifications will be sent to this email address.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您的账号已成功创建，手机号码已验证。</p><p>重要通知（账号、预约、日程和上课提醒）将发送至该邮箱地址。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Welcome / 欢迎加入

Hi {{student_name}},

Your account has been created successfully. Your phone number has been verified.

Important account, booking, schedule and reminder notifications will be sent to this email address.

----------------------------------------

{{student_name}}，您好：

您的账号已成功创建，手机号码已验证。

重要通知（账号、预约、日程和上课提醒）将发送至该邮箱地址。

— EZDRIVES · {{website_url}}"""),

  ("tpl_phone_verified", "PHONE_VERIFIED", "Phone Verified",
   "Your phone number has been verified / 手机号已验证",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Phone Verified / 手机号已验证</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your phone number has been successfully verified.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您的手机号已成功验证。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Phone Verified / 手机号已验证

Hi {{student_name}},

Your phone number has been successfully verified.

----------------------------------------

{{student_name}}，您好：

您的手机号已成功验证。

— EZDRIVES"""),

  ("tpl_booking_confirmed", "BOOKING_CONFIRMED", "Booking Confirmed",
   "Your {{course_name}} lesson is confirmed / {{course_name}} 预约已确认",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Booking Confirmed / 预约已确认</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your lesson is confirmed:</p><p><b>{{course_name}}</b><br/>{{booking_date}} at {{booking_time}} (ID: {{booking_id}})</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您的课程预约成功：</p><p><b>{{course_name}}</b><br/>{{booking_date}} {{booking_time}}（预约编号：{{booking_id}}）</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Booking Confirmed / 预约已确认

Hi {{student_name}},

Your lesson is confirmed:
{{course_name}} on {{booking_date}} at {{booking_time}} (ID: {{booking_id}}).

----------------------------------------

{{student_name}}，您好：

您的课程预约成功：
{{course_name}}，{{booking_date}} {{booking_time}}（预约编号：{{booking_id}}）。

— EZDRIVES · {{website_url}}"""),

  ("tpl_booking_cancelled", "BOOKING_CANCELLED", "Booking Cancelled",
   "Your {{course_name}} lesson was cancelled / {{course_name}} 预约已取消",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#E5484D">Booking Cancelled / 预约已取消</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your {{course_name}} lesson on {{booking_date}} at {{booking_time}} has been cancelled.</p><p>If you have any questions, please contact the instructor.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您的{{course_name}}课程（{{booking_date}} {{booking_time}}）已取消。</p><p>如有任何疑问，请联系教练。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Booking Cancelled / 预约已取消

Hi {{student_name}},

Your {{course_name}} lesson on {{booking_date}} at {{booking_time}} has been cancelled.

If you have any questions, please contact the instructor.

----------------------------------------

{{student_name}}，您好：

您的{{course_name}}课程（{{booking_date}} {{booking_time}}）已取消。

如有任何疑问，请联系教练。

— EZDRIVES"""),

  ("tpl_booking_rescheduled", "BOOKING_RESCHEDULED", "Booking Rescheduled",
   "Your {{course_name}} lesson was rescheduled / {{course_name}} 预约已改期",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#3B82F6">Booking Rescheduled / 预约已改期</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your {{course_name}} lesson has been rescheduled to <b>{{booking_date}} at {{booking_time}}</b>.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您的{{course_name}}课程已改期至<b>{{booking_date}} {{booking_time}}</b>。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Booking Rescheduled / 预约已改期

Hi {{student_name}},

Your {{course_name}} lesson has been rescheduled to {{booking_date}} at {{booking_time}}.

----------------------------------------

{{student_name}}，您好：

您的{{course_name}}课程已改期至 {{booking_date}} {{booking_time}}。

— EZDRIVES"""),

  ("tpl_booking_reminder", "BOOKING_REMINDER", "Booking Reminder",
   "Reminder: {{course_name}} lesson / 上课提醒：{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Lesson Reminder / 上课提醒</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Just a reminder: your <b>{{course_name}}</b> lesson is on <b>{{booking_date}} at {{booking_time}}</b>.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>温馨提醒：您的<b>{{course_name}}</b>课程将在<b>{{booking_date}} {{booking_time}}</b>进行。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Lesson Reminder / 上课提醒

Hi {{student_name}},

Just a reminder: your {{course_name}} lesson is on {{booking_date}} at {{booking_time}}.

----------------------------------------

{{student_name}}，您好：

温馨提醒：您的 {{course_name}} 课程将在 {{booking_date}} {{booking_time}} 进行。

— EZDRIVES · {{website_url}}"""),

  ("tpl_account_update", "ACCOUNT_UPDATED", "Account Update",
   "Your EZDRIVES account was updated / 您的 EZDRIVES 账号已更新",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#3B82F6">Account Update / 账号更新</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your account details were recently updated. If this was not you, please contact us.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您的账号资料最近已被更新。如果这不是您本人操作，请联系我们。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Account Update / 账号更新

Hi {{student_name}},

Your account details were recently updated. If this was not you, please contact us.

----------------------------------------

{{student_name}}，您好：

您的账号资料最近已被更新。如果这不是您本人操作，请联系我们。

— EZDRIVES"""),

  ("tpl_password_reset", "PASSWORD_RESET", "Password Reset",
   "Reset your EZDRIVES password / 重置您的 EZDRIVES 密码",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Password Reset / 重置密码</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Use the link below to reset your password. This link expires shortly.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>请使用以下链接重置您的密码。该链接即将过期。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Password Reset / 重置密码

Hi {{student_name}},

Use the link below to reset your password. This link expires shortly.

----------------------------------------

{{student_name}}，您好：

请使用以下链接重置您的密码。该链接即将过期。

— EZDRIVES"""),

  ("tpl_instructor_new_booking", "NEW_BOOKING", "Instructor: New Booking",
   "New booking: {{course_name}} / 新预约：{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">New Booking / 新预约</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{instructor_name}},</p><p>New booking: <b>{{course_name}}</b> on <b>{{booking_date}} at {{booking_time}}</b>.</p><p>Student: {{student_name}} ({{student_phone}})</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{instructor_name}}，您好：</p><p>新预约：<b>{{course_name}}</b>，时间 <b>{{booking_date}} {{booking_time}}</b>。</p><p>学员：{{student_name}}（{{student_phone}}）</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """New Booking / 新预约

Hi {{instructor_name}},

New booking: {{course_name}} on {{booking_date}} at {{booking_time}} — student {{student_name}} ({{student_phone}}).

----------------------------------------

{{instructor_name}}，您好：

新预约：{{course_name}}，时间 {{booking_date}} {{booking_time}}——学员 {{student_name}}（{{student_phone}}）。

— EZDRIVES"""),

  ("tpl_instructor_booking_cancelled", "INSTRUCTOR_BOOKING_CANCELLED", "Instructor: Booking Cancelled",
   "Booking cancelled: {{course_name}} / 预约已取消：{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#E5484D">Booking Cancelled / 预约已取消</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{instructor_name}},</p><p>The {{course_name}} lesson on {{booking_date}} at {{booking_time}} (student {{student_name}}) has been cancelled.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{instructor_name}}，您好：</p><p>{{course_name}}课程（{{booking_date}} {{booking_time}}，学员 {{student_name}}）已取消。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Booking Cancelled / 预约已取消

Hi {{instructor_name}},

The {{course_name}} lesson on {{booking_date}} at {{booking_time}} (student {{student_name}}) has been cancelled.

----------------------------------------

{{instructor_name}}，您好：

{{course_name}}课程（{{booking_date}} {{booking_time}}，学员 {{student_name}}）已取消。

— EZDRIVES"""),

  ("tpl_instructor_booking_rescheduled", "INSTRUCTOR_BOOKING_RESCHEDULED", "Instructor: Booking Rescheduled",
   "Booking rescheduled: {{course_name}} / 预约已改期：{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#3B82F6">Booking Rescheduled / 预约已改期</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{instructor_name}},</p><p>The {{course_name}} lesson with {{student_name}} has been rescheduled to <b>{{booking_date}} at {{booking_time}}</b>.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{instructor_name}}，您好：</p><p>学员 {{student_name}} 的{{course_name}}课程已改期至<b>{{booking_date}} {{booking_time}}</b>。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Booking Rescheduled / 预约已改期

Hi {{instructor_name}},

The {{course_name}} lesson with {{student_name}} has been rescheduled to {{booking_date}} at {{booking_time}}.

----------------------------------------

{{instructor_name}}，您好：

学员 {{student_name}} 的{{course_name}}课程已改期至 {{booking_date}} {{booking_time}}。

— EZDRIVES"""),

  ("tpl_instructor_schedule_update", "SCHEDULE_UPDATE", "Instructor: Schedule Update",
   "Your schedule has been updated / 您的日程已更新",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#3B82F6">Schedule Update / 日程更新</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{instructor_name}},</p><p>Your working schedule was updated. Affected bookings have been handled automatically.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{instructor_name}}，您好：</p><p>您的工作日程已更新，受影响的预约已自动处理。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Schedule Update / 日程更新

Hi {{instructor_name}},

Your working schedule was updated. Affected bookings have been handled automatically.

----------------------------------------

{{instructor_name}}，您好：

您的工作日程已更新，受影响的预约已自动处理。

— EZDRIVES"""),

  ("tpl_system", "SYSTEM_NOTIFICATION", "System Notification",
   "EZDRIVES system notice / EZDRIVES 系统通知",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#667085">System Notice / 系统通知</h2><div style="font-size:14px;line-height:1.6"><p>This is a system notice from EZDRIVES.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>这是来自 EZDRIVES 的系统通知。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """System Notice / 系统通知

This is a system notice from EZDRIVES.

----------------------------------------

这是来自 EZDRIVES 的系统通知。

— EZDRIVES"""),

  ("tpl_important_account", "IMPORTANT_ACCOUNT", "Important Account Notice",
   "Important: action needed on your EZDRIVES account / 重要：您的 EZDRIVES 账号需要处理",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#E5484D">Important / 重要通知</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Please take action on your EZDRIVES account.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您的 EZDRIVES 账号需要您的处理。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Important / 重要通知

Hi {{student_name}},

Please take action on your EZDRIVES account.

----------------------------------------

{{student_name}}，您好：

您的 EZDRIVES 账号需要您的处理。

— EZDRIVES"""),

  ("tpl_new_purchase", "NEW_PURCHASE", "New Course Purchase",
   "New Course Purchase — {{student_name}} / 新课程购买——{{student_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">New Course Purchase / 新课程购买</h2><div style="font-size:14px;line-height:1.6"><p>A student submitted a new course purchase.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Student / 学员</b></td><td style="padding:6px 0">{{student_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Phone / 电话</b></td><td style="padding:6px 0">{{student_phone}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Email / 邮箱</b></td><td style="padding:6px 0">{{student_email}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course / 课程</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course Type / 课程类型</b></td><td style="padding:6px 0">{{course_type}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>License / 驾照类别</b></td><td style="padding:6px 0">{{license_class}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Original Price / 原价</b></td><td style="padding:6px 0">{{original_price}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Discount / 优惠</b></td><td style="padding:6px 0">{{discount_amount}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Final Price / 实付</b></td><td style="padding:6px 0">{{final_price}}</td></tr></table><p style="color:#667085;font-size:13px">Payment status: pending confirmation / 支付状态：待确认</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """New Course Purchase / 新课程购买

A student submitted a new course purchase.

Student / 学员: {{student_name}}
Phone / 电话: {{student_phone}}
Email / 邮箱: {{student_email}}
Course / 课程: {{course_name}}
Course Type / 课程类型: {{course_type}}
License / 驾照类别: {{license_class}}
Original Price / 原价: {{original_price}}
Discount / 优惠: {{discount_amount}}
Final Price / 实付: {{final_price}}
Payment status / 支付状态: Pending confirmation / 待确认

— EZDRIVES"""),

  ("tpl_purchase_confirmed", "PURCHASE_CONFIRMED", "Purchase Confirmed",
   "Your purchase is confirmed — {{course_name}} / 购买已确认——{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Purchase Confirmed / 购买已确认 🎉</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your purchase of <b>{{course_name}}</b> has been confirmed.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Original Price / 原价</b></td><td style="padding:6px 0">{{original_price}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Discount / 优惠</b></td><td style="padding:6px 0">{{discount_amount}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Final Price / 实付</b></td><td style="padding:6px 0">{{final_price}}</td></tr></table><p>You can now book your lesson time from your dashboard.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您购买的<b>{{course_name}}</b>已确认。</p><p>您现在可以从个人中心预约上课时间。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Purchase Confirmed / 购买已确认

Hi {{student_name}},

Your purchase of {{course_name}} has been confirmed.
Original Price / 原价: {{original_price}}
Discount / 优惠: {{discount_amount}}
Final Price / 实付: {{final_price}}

You can now book your lesson time from your dashboard.

----------------------------------------

{{student_name}}，您好：

您购买的 {{course_name}} 已确认。
原价：{{original_price}}
优惠：{{discount_amount}}
实付：{{final_price}}

您现在可以从个人中心预约上课时间。

— EZDRIVES · {{website_url}}"""),

  ("tpl_payment_rejected", "PAYMENT_REJECTED", "Payment Rejected",
   "Payment update — {{course_name}} / 支付通知——{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#E5484D">Payment Update / 支付通知</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Your payment for <b>{{course_name}}</b> was not confirmed. Please contact the instructor to resolve this.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>您对<b>{{course_name}}</b>的支付未被确认。请联系教练解决。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Payment Update / 支付通知

Hi {{student_name}},

Your payment for {{course_name}} was not confirmed. Please contact the instructor.

----------------------------------------

{{student_name}}，您好：

您对 {{course_name}} 的支付未被确认。请联系教练解决。

— EZDRIVES"""),

  ("tpl_lesson_completed", "LESSON_COMPLETED", "Lesson Completed",
   "Lesson {{lesson_number}} completed — {{course_name}} / 第 {{lesson_number}} 课已完成——{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Lesson Completed / 课时已完成 ✅</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>Lesson <b>{{lesson_number}}</b> ({{lesson_title}}) of <b>{{course_name}}</b> has been marked complete by your instructor.</p><p>Your next lesson is now available to book.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>教练已将<b>{{course_name}}</b>的第<b>{{lesson_number}}</b>课（{{lesson_title}}）标记为完成。</p><p>您的下一课现在可以预约了。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Lesson Completed / 课时已完成

Hi {{student_name}},

Lesson {{lesson_number}} ({{lesson_title}}) of {{course_name}} has been marked complete by your instructor.

Your next lesson is now available to book.

----------------------------------------

{{student_name}}，您好：

教练已将 {{course_name}} 的第 {{lesson_number}} 课（{{lesson_title}}）标记为完成。

您的下一课现在可以预约了。

— EZDRIVES · {{website_url}}"""),

  ("tpl_doc_uploaded", "DOCUMENT_UPLOADED", "Certificate Documents Uploaded",
   "Certificate documents uploaded — {{student_name}} / 证书证件已上传——{{student_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Certificate Documents Uploaded / 证书证件已上传</h2><div style="font-size:14px;line-height:1.6"><p>A student uploaded their driver licence documents for the Full Course Certificate service.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Student / 学员</b></td><td style="padding:6px 0">{{student_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Phone / 电话</b></td><td style="padding:6px 0">{{student_phone}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Email / 邮箱</b></td><td style="padding:6px 0">{{student_email}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Service / 服务</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Documents / 证件</b></td><td style="padding:6px 0">Front ✓ · Back ✓ / 正面 ✓ · 背面 ✓</td></tr></table><p style="color:#667085;font-size:13px">Sign in to review the documents securely / 请登录后安全查看证件。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Certificate Documents Uploaded / 证书证件已上传

Student / 学员: {{student_name}}
Phone / 电话: {{student_phone}}
Email / 邮箱: {{student_email}}
Service / 服务: {{course_name}}
Documents / 证件: Front ✓ · Back ✓ / 正面 ✓ · 背面 ✓

Sign in to review the documents securely / 请登录后安全查看证件。

— EZDRIVES"""),

  ("tpl_cash_request", "CASH_REQUEST", "Cash Payment Request",
   "Cash payment request — {{student_name}} / 现金支付申请——{{student_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Cash Payment Request / 现金支付申请</h2><div style="font-size:14px;line-height:1.6"><p>A student requested to pay in cash.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Student / 学员</b></td><td style="padding:6px 0">{{student_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Phone / 电话</b></td><td style="padding:6px 0">{{student_phone}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Email / 邮箱</b></td><td style="padding:6px 0">{{student_email}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course / 课程</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course Type / 课程类型</b></td><td style="padding:6px 0">{{course_type}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>License / 驾照类别</b></td><td style="padding:6px 0">{{license_class}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Amount / 金额</b></td><td style="padding:6px 0">{{final_price}}</td></tr></table><p>Sign in to approve the cash request, then mark the payment as received once you have the cash.</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """Cash Payment Request / 现金支付申请

A student requested to pay in cash.

Student / 学员: {{student_name}}
Phone / 电话: {{student_phone}}
Email / 邮箱: {{student_email}}
Course / 课程: {{course_name}}
Course Type / 课程类型: {{course_type}}
License / 驾照类别: {{license_class}}
Amount / 金额: {{final_price}}

Sign in to approve the cash request, then mark the payment as received once you have the cash.
/ 请登录批准现金申请，收到现金后标记为已收款。

— EZDRIVES"""),

  ("tpl_cash_approved", "CASH_APPROVED", "Cash Payment Approved",
   "Cash payment approved — book your first lesson / 现金支付已批准——可预约第一节课",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Cash Payment Approved / 现金支付已批准 💵</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>The instructor approved your cash payment for <b>{{course_name}}</b> ({{final_price}}).</p><p>You can now book your <b>first lesson</b>. The remaining lessons unlock once the instructor receives the cash.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>教练已批准您对<b>{{course_name}}</b>（{{final_price}}）的现金支付。</p><p>您现在可以预约<b>第一节课</b>。教练收到现金后，其余课程将解锁。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Cash Payment Approved / 现金支付已批准

Hi {{student_name}},

The instructor approved your cash payment for {{course_name}} ({{final_price}}).

You can now book your first lesson. The remaining lessons unlock once the instructor receives the cash.

----------------------------------------

{{student_name}}，您好：

教练已批准您对 {{course_name}}（{{final_price}}）的现金支付。

您现在可以预约第一节课。教练收到现金后，其余课程将解锁。

— EZDRIVES · {{website_url}}"""),

  ("tpl_cash_received", "CASH_RECEIVED", "Cash Payment Received",
   "Payment received — all lessons unlocked / 已收到现金——全部课程已解锁",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Payment Received / 已收到付款 ✅</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>The instructor received your cash payment for <b>{{course_name}}</b> ({{final_price}}).</p><p>All lessons are now unlocked — book any remaining lessons from your dashboard.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>教练已收到您对<b>{{course_name}}</b>（{{final_price}}）的现金支付。</p><p>所有课程现已解锁——请从个人中心预约剩余课时。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Payment Received / 已收到付款

Hi {{student_name}},

The instructor received your cash payment for {{course_name}} ({{final_price}}).

All lessons are now unlocked — book any remaining lessons from your dashboard.

----------------------------------------

{{student_name}}，您好：

教练已收到您对 {{course_name}}（{{final_price}}）的现金支付。

所有课程现已解锁——请从个人中心预约剩余课时。

— EZDRIVES · {{website_url}}"""),

  ("tpl_cash_reminder", "CASH_REMINDER", "Cash Payment Reminder",
   "Reminder: cash payment for {{course_name}} / 现金支付提醒：{{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Cash Payment Reminder / 现金支付提醒</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{student_name}},</p><p>This is a friendly reminder that your cash payment for <b>{{course_name}}</b> ({{final_price}}) has not been received yet.</p><p>Once the instructor receives the cash, all your lessons unlock.</p></div><hr style="border:none;border-top:1px solid #E6E6E6;margin:16px 0"><div style="font-size:14px;line-height:1.6"><p>{{student_name}}，您好：</p><p>温馨提醒：您对<b>{{course_name}}</b>（{{final_price}}）的现金支付尚未被收到。</p><p>教练收到现金后，您的全部课程将解锁。</p></div><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>""",
   """Cash Payment Reminder / 现金支付提醒

Hi {{student_name}},

This is a friendly reminder that your cash payment for {{course_name}} ({{final_price}}) has not been received yet.

Once the instructor receives the cash, all your lessons unlock.

----------------------------------------

{{student_name}}，您好：

温馨提醒：您对 {{course_name}}（{{final_price}}）的现金支付尚未被收到。

教练收到现金后，您的全部课程将解锁。

— EZDRIVES · {{website_url}}"""),
]

def esc(s):
    return s.replace("'", "''")

rows = []
for tid, ttype, name, subject, html, text in TPL:
    rows.append(
        "('%s', '%s', '%s', '%s',\n '%s',\n '%s',\n 1, 1, '')"
        % (esc(tid), esc(ttype), esc(name), esc(subject), esc(html), esc(text))
    )

header = """-- ============================================================================
-- EZDRIVES — Bilingual (EN/中文) email templates (0009)
-- Every notification template now contains BOTH English and Chinese
-- (subject, HTML body and plain-text body). Idempotent: INSERT OR REPLACE
-- keyed on the stable template id — re-running overwrites to the same state.
-- ============================================================================

INSERT OR REPLACE INTO notification_templates (id, type, name, subject, html_body, text_body, enabled, is_system, updated_at) VALUES
"""
body = ",\n\n".join(rows) + ";\n"

with open("migrations/0009_bilingual_templates.sql", "w", encoding="utf-8") as f:
    f.write(header + body)

print(f"wrote {len(TPL)} templates")
