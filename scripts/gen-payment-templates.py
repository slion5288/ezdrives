#!/usr/bin/env python3
# Generates migrations/0010_payment_templates.sql — WeChat / EMT request +
# confirmation emails (§ Final Payment Fix), bilingual EN/中文, idempotent.

TPL = [
  ("tpl_wechat_request", "WECHAT_REQUEST", "WeChat Payment Pending",
   "New WeChat payment pending — {{student_name}} / 新的微信支付待确认——{{student_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">New WeChat Payment Pending / 新的微信支付待确认</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{instructor_name}},</p><p>A student submitted a WeChat payment.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Student / 学员</b></td><td style="padding:6px 0">{{student_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course / 课程</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Amount / 金额</b></td><td style="padding:6px 0">{{final_price}} CAD</td></tr><tr><td style="padding:6px 0;color:#667085"><b>WeChat Amount / 微信支付金额</b></td><td style="padding:6px 0">{{payment_amount_cny}}</td></tr></table><p>Mark the payment as received once the money arrives.</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """New WeChat Payment Pending / 新的微信支付待确认

Hi {{instructor_name}},

A student submitted a WeChat payment.

Student / 学员: {{student_name}}
Course / 课程: {{course_name}}
Amount / 金额: {{final_price}} CAD
WeChat Amount / 微信支付金额: {{payment_amount_cny}}

Mark the payment as received once the money arrives.

— EZDRIVES"""),

  ("tpl_wechat_confirmed", "WECHAT_CONFIRMED", "WeChat Payment Confirmation",
   "Payment Confirmation / 付款确认 — {{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Payment Confirmation / 付款确认</h2><div style="font-size:14px;line-height:1.6"><p>Dear Student,</p><p>We have received your payment.</p><p>亲爱的学员：</p><p>我们已经收到您的付款。</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Course / 课程</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Method / 付款方式</b></td><td style="padding:6px 0">WeChat / 微信</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Amount / 金额</b></td><td style="padding:6px 0">{{final_price}} CAD</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Amount / 支付金额</b></td><td style="padding:6px 0">{{payment_amount_cny}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Status / 支付状态</b></td><td style="padding:6px 0">PAID / 已付款</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Received / 收款时间</b></td><td style="padding:6px 0">{{payment_received_at}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Instructor / 教练</b></td><td style="padding:6px 0">{{instructor_name}}</td></tr></table><p>Your course booking access is now available.</p><p>您现在可以预约您的课程。</p><p style="color:#667085;font-size:13px">Thank you,<br/>EZ Drives</p></div></div>""",
   """Payment Confirmation / 付款确认

Dear Student, / 亲爱的学员：

We have received your payment. / 我们已经收到您的付款。

Course / 课程: {{course_name}}
Payment Method / 付款方式: WeChat / 微信
Amount / 金额: {{final_price}} CAD
Payment Amount / 支付金额: {{payment_amount_cny}}
Payment Status / 支付状态: PAID / 已付款
Payment Received / 收款时间: {{payment_received_at}}
Instructor / 教练: {{instructor_name}}

Your course booking access is now available. / 您现在可以预约您的课程。

Thank you,
EZ Drives"""),

  ("tpl_emt_request", "EMT_REQUEST", "EMT Payment Pending",
   "New EMT payment pending — {{student_name}} / 新的 EMT 转账待确认——{{student_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">New EMT Payment Pending / 新的 EMT 转账待确认</h2><div style="font-size:14px;line-height:1.6"><p>Hi {{instructor_name}},</p><p>A student submitted an e-Transfer (EMT) payment.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Student / 学员</b></td><td style="padding:6px 0">{{student_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course / 课程</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Amount / 金额</b></td><td style="padding:6px 0">{{final_price}} CAD</td></tr></table><p>Mark the payment as received once the money arrives.</p></div><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>""",
   """New EMT Payment Pending / 新的 EMT 转账待确认

Hi {{instructor_name}},

A student submitted an e-Transfer (EMT) payment.

Student / 学员: {{student_name}}
Course / 课程: {{course_name}}
Amount / 金额: {{final_price}} CAD

Mark the payment as received once the money arrives.

— EZDRIVES"""),

  ("tpl_emt_confirmed", "EMT_CONFIRMED", "EMT Payment Confirmation",
   "Payment Confirmation / 付款确认 — {{course_name}}",
   """<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Payment Confirmation / 付款确认</h2><div style="font-size:14px;line-height:1.6"><p>Dear Student,</p><p>We have received your payment.</p><p>亲爱的学员：</p><p>我们已经收到您的付款。</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Course / 课程</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Method / 付款方式</b></td><td style="padding:6px 0">e-Transfer (EMT) / EMT 转账</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Amount / 金额</b></td><td style="padding:6px 0">{{final_price}} CAD</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Status / 支付状态</b></td><td style="padding:6px 0">PAID / 已付款</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Received / 收款时间</b></td><td style="padding:6px 0">{{payment_received_at}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Instructor / 教练</b></td><td style="padding:6px 0">{{instructor_name}}</td></tr></table><p>Your course booking access is now available.</p><p>您现在可以预约您的课程。</p><p style="color:#667085;font-size:13px">Thank you,<br/>EZ Drives</p></div></div>""",
   """Payment Confirmation / 付款确认

Dear Student, / 亲爱的学员：

We have received your payment. / 我们已经收到您的付款。

Course / 课程: {{course_name}}
Payment Method / 付款方式: e-Transfer (EMT) / EMT 转账
Amount / 金额: {{final_price}} CAD
Payment Status / 支付状态: PAID / 已付款
Payment Received / 收款时间: {{payment_received_at}}
Instructor / 教练: {{instructor_name}}

Your course booking access is now available. / 您现在可以预约您的课程。

Thank you,
EZ Drives"""),
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
-- EZDRIVES — WeChat / EMT payment email templates (0010, § Final Payment Fix)
-- WECHAT_REQUEST / EMT_REQUEST  → instructor, new pending payment
-- WECHAT_CONFIRMED / EMT_CONFIRMED → student, bilingual Payment Confirmation
-- Idempotent: INSERT OR REPLACE keyed on the stable template id.
-- ============================================================================

INSERT OR REPLACE INTO notification_templates (id, type, name, subject, html_body, text_body, enabled, is_system, updated_at) VALUES
"""
with open("migrations/0010_payment_templates.sql", "w", encoding="utf-8") as f:
    f.write(header + ",\n\n".join(rows) + ";\n")
print("wrote", len(TPL), "templates")
