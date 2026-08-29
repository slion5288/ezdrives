#!/usr/bin/env python3
# Generate migrations/0013_templates_zh.sql — Chinese-only template content
# (subject_zh/body_zh) + auto-translated EN, baking the bilingual subject /
# html_body / text_body the email service sends. EN comes from the site's own
# translation chain (MyMemory zh-CN→en).
import json, time, urllib.request, urllib.parse

def mt(text):
    url = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode({"q": text, "langpair": "zh-CN|en"})
    for _ in range(4):
        try:
            with urllib.request.urlopen(url, timeout=25) as r:
                d = json.loads(r.read().decode())
            s = d.get("responseData", {}).get("translatedText", "")
            if s and d.get("responseStatus") == 200:
                return s
        except Exception:
            pass
        time.sleep(2.5)
    return ""

# type -> (subject_zh, body_zh)
TPL = {
"BOOKING_CONFIRMED": ("预约已确认", "{{student_name}}，您好！您已成功预约{{course_name}}课程。时间：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）；接送地点：{{booking_location}}。如需取消或改期，请在课程开始前至少 24 小时操作。"),
"NEW_BOOKING": ("新预约通知", "{{student_name}} 预约了{{course_name}}：{{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}），接送地点：{{booking_location}}。请按时上课。"),
"BOOKING_CANCELLED": ("预约已取消", "{{student_name}}，您的{{course_name}}课程（{{booking_date}} {{booking_time}}）已取消。如需重新预约，请登录网站操作。"),
"BOOKING_RESCHEDULED": ("预约已改期", "{{student_name}}，您的{{course_name}}课程已改期至 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）。"),
"BOOKING_REMINDER": ("上课提醒", "{{student_name}}，您的{{course_name}}课程将于 {{booking_date}} {{booking_time}}（{{booking_start_time}}–{{booking_end_time}}）开始，接送地点：{{booking_location}}。到时见！"),
"LESSON_COMPLETED": ("课时已完成", "{{student_name}}，您的{{course_name}}{{lesson_title}}课时已完成。感谢您的学习，继续加油！"),
"STUDENT_REGISTERED": ("欢迎加入 EZDRIVES", "{{student_name}}，欢迎注册 EZDRIVES 驾驶学院！您的账号已创建，现在可以浏览课程、购买并预约时间。"),
"PURCHASE_CONFIRMED": ("购买成功", "{{student_name}}，您购买的{{course_name}}（{{final_price}} CAD）已确认。现在可以预约课程时间了。"),
"PAYMENT_REJECTED": ("支付被拒绝", "{{student_name}}，您对{{course_name}}的支付被拒绝。请重新提交支付或联系教练：{{instructor_phone}}。"),
"CASH_REQUEST": ("新的现金支付申请", "{{student_name}} 申请以现金支付{{course_name}}（{{final_price}} CAD）。请核对后确认收款。"),
"CASH_APPROVED": ("现金支付已批准", "{{student_name}}，教练已批准您的现金支付。您现在可以预约第一节课；教练收到现金后其余课程将解锁。"),
"CASH_RECEIVED": ("已收到现金支付", "{{student_name}}，教练已收到您的现金支付（收款时间：{{payment_received_at}}，经手人：{{payment_received_by}}）。所有课程现已解锁。"),
"CASH_REMINDER": ("现金支付提醒", "{{student_name}}，您还有一笔未完成的现金支付（{{course_name}}，{{final_price}} CAD）。请尽快与教练完成付款，付款后即可预约课程。"),
"WECHAT_REQUEST": ("新的微信支付待确认", "{{student_name}} 提交了对{{course_name}}的微信支付（{{final_price}} CAD，约{{payment_amount_cny}}）。收到款项后请确认收款。"),
"WECHAT_CONFIRMED": ("微信支付已确认", "{{student_name}}，教练已收到您的微信支付（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。"),
"EMT_REQUEST": ("新的 EMT 转账待确认", "{{student_name}} 提交了对{{course_name}}的 Interac e-Transfer（{{final_price}} CAD）。收到款项后请确认收款。"),
"EMT_CONFIRMED": ("EMT 转账已确认", "{{student_name}}，教练已收到您的 e-Transfer（{{course_name}}，{{final_price}} CAD，收款时间：{{payment_received_at}}）。所有课程现已解锁。"),
"NEW_PURCHASE": ("新的课程购买", "{{student_name}} 购买了{{course_name}}（{{final_price}} CAD）。请及时确认收款。"),
"DOCUMENT_UPLOADED": ("学员证件已上传", "{{student_name}} 已上传驾照正反面照片。请登录审核。"),
"INSTRUCTOR_BOOKING_CANCELLED": ("学员取消预约", "{{student_name}} 取消了{{course_name}}（{{booking_date}} {{booking_time}}）的预约。"),
"INSTRUCTOR_BOOKING_RESCHEDULED": ("学员改期预约", "{{student_name}} 已将{{course_name}}课程改期至 {{booking_date}} {{booking_time}}。"),
"SCHEDULE_UPDATE": ("课程安排变更", "{{student_name}}，您的{{course_name}}课程安排有变更，请登录查看最新安排。"),
"ACCOUNT_UPDATED": ("账号信息已更新", "{{student_name}}，您的账号信息已更新。若非本人操作，请及时联系教练：{{instructor_phone}}。"),
"PHONE_VERIFIED": ("手机号已验证", "{{student_name}}，您的手机号验证成功。"),
"PASSWORD_RESET": ("重置密码", "您请求重置密码。如非本人操作，请忽略此邮件；如需帮助请联系{{company_name}}：{{company_email}}。"),
"IMPORTANT_ACCOUNT": ("重要账号通知", "您的账号有重要变更，请尽快登录查看详情。"),
"SYSTEM_NOTIFICATION": ("系统通知", "{{student_name}}，您有一条新的系统通知，请登录网站查看。"),
"DAILY_SCHEDULE": ("今日课表", "{{instructor_name}}，以下是今天的课程安排：\n{{schedule_summary}}\n祝教学顺利！"),
}

def esc(s):
    return s.replace("'", "''")

rows = []
for t in sorted(TPL):
    zh_subj, zh_body = TPL[t]
    en_subj = mt(zh_subj); time.sleep(1.1)
    en_body = mt(zh_body); time.sleep(1.1)
    rows.append((t, zh_subj, zh_body, en_subj, en_body))

sql = []
sql.append("-- EZDRIVES — 0013: Chinese-only template content (subject_zh/body_zh)")
sql.append("-- Adds per-template Chinese fields and rewrites the bilingual subject /")
sql.append("-- html_body / text_body (EN auto-translated via the site's chain).")
sql.append("ALTER TABLE notification_templates ADD COLUMN subject_zh TEXT DEFAULT '';")
sql.append("ALTER TABLE notification_templates ADD COLUMN body_zh TEXT DEFAULT '';")
sql.append("")
for t, zh_subj, zh_body, en_subj, en_body in rows:
    subject = f"{en_subj} / {zh_subj}"
    html = (
        "<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#1C1917\">"
        f"<h2 style=\"color:#A21CAF;margin:0 0 12px\">{en_subj}</h2>"
        f"<div style=\"font-size:15px;line-height:1.7\">{en_body.replace(chr(10), '<br/>')}</div>"
        "<hr style=\"border:none;border-top:1px solid #E5DFD5;margin:20px 0\"/>"
        f"<h2 style=\"color:#A21CAF;margin:0 0 12px\">{zh_subj}</h2>"
        f"<div style=\"font-size:15px;line-height:1.7\">{zh_body.replace(chr(10), '<br/>')}</div>"
        "</div>"
    )
    text = f"{en_subj}\n\n{en_body}\n\n---\n\n{zh_subj}\n{zh_body}"
    sql.append(
        "UPDATE notification_templates SET subject_zh = '" + esc(zh_subj) + "', body_zh = '" + esc(zh_body)
        + "', subject = '" + esc(subject) + "', html_body = '" + esc(html) + "', text_body = '" + esc(text)
        + "', updated_at = '' WHERE type = '" + t + "';"
    )
sql.append("")
open("migrations/0013_templates_zh.sql", "w", encoding="utf-8").write("\n".join(sql))
print("wrote migrations/0013_templates_zh.sql")
for t, zh_subj, zh_body, en_subj, en_body in rows:
    print(f"- {t}: {en_subj} | {zh_subj}")
