-- ============================================================================
-- EZDRIVES — Cash payment email templates (0008, §28)
-- CASH_REQUEST   → instructor, when a student requests to pay in cash
-- CASH_APPROVED  → student, when the instructor approves the cash request
-- CASH_RECEIVED  → student, when the instructor marks the cash as received
-- CASH_REMINDER  → student, optional manual reminder for an unpaid cash payment
-- Idempotent: INSERT OR IGNORE keyed on the stable template id.
-- ============================================================================

INSERT OR IGNORE INTO notification_templates (id, type, name, subject, html_body, text_body, enabled, is_system, updated_at) VALUES
('tpl_cash_request', 'CASH_REQUEST', 'Cash Payment Request',
 'Cash payment request — {{student_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Cash Payment Request</h2><p>A student requested to pay in cash.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Student</b></td><td style="padding:6px 0">{{student_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Phone</b></td><td style="padding:6px 0">{{student_phone}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Email</b></td><td style="padding:6px 0">{{student_email}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course Type</b></td><td style="padding:6px 0">{{course_type}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>License</b></td><td style="padding:6px 0">{{license_class}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Amount</b></td><td style="padding:6px 0">{{final_price}}</td></tr></table><p>Sign in to approve the cash request, then mark the payment as received once you have the cash.</p><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>',
 'Cash Payment Request\n\nStudent: {{student_name}}\nPhone: {{student_phone}}\nEmail: {{student_email}}\nCourse: {{course_name}}\nCourse Type: {{course_type}}\nLicense: {{license_class}}\nAmount: {{final_price}}\n\nSign in to approve the cash request, then mark the payment as received once you have the cash.',
 1, 1, ''),

('tpl_cash_approved', 'CASH_APPROVED', 'Cash Payment Approved',
 'Cash payment approved — book your first lesson',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Cash Payment Approved 💵</h2><p>Hi {{student_name}},</p><p>The instructor approved your cash payment for <b>{{course_name}}</b> ({{final_price}}).</p><p>You can now book your <b>first lesson</b>. The remaining lessons unlock once the instructor receives the cash.</p><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>',
 'Cash Payment Approved\n\nHi {{student_name}},\n\nThe instructor approved your cash payment for {{course_name}} ({{final_price}}).\n\nYou can now book your first lesson. The remaining lessons unlock once the instructor receives the cash.',
 1, 1, ''),

('tpl_cash_received', 'CASH_RECEIVED', 'Cash Payment Received',
 'Payment received — all lessons unlocked',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Payment Received ✅</h2><p>Hi {{student_name}},</p><p>The instructor received your cash payment for <b>{{course_name}}</b> ({{final_price}}).</p><p>All lessons are now unlocked — book any remaining lessons from your dashboard.</p><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>',
 'Payment Received\n\nHi {{student_name}},\n\nThe instructor received your cash payment for {{course_name}} ({{final_price}}).\n\nAll lessons are now unlocked — book any remaining lessons from your dashboard.',
 1, 1, ''),

('tpl_cash_reminder', 'CASH_REMINDER', 'Cash Payment Reminder',
 'Reminder: cash payment for {{course_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Cash Payment Reminder</h2><p>Hi {{student_name}},</p><p>This is a friendly reminder that your cash payment for <b>{{course_name}}</b> ({{final_price}}) has not been received yet.</p><p>Once the instructor receives the cash, all your lessons unlock.</p><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>',
 'Cash Payment Reminder\n\nHi {{student_name}},\n\nThis is a friendly reminder that your cash payment for {{course_name}} ({{final_price}}) has not been received yet.\n\nOnce the instructor receives the cash, all your lessons unlock.',
 1, 1, '');
