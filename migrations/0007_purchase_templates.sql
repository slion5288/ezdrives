-- ============================================================================
-- EZDRIVES — Notification templates for purchase & completion events (0007)
-- Adds the templates planned in EMAIL_TEMPLATE_PLAN.md §2.
-- Idempotent: INSERT OR IGNORE keyed on the stable template id.
-- ============================================================================

INSERT OR IGNORE INTO notification_templates (id, type, name, subject, html_body, text_body, enabled, is_system, updated_at) VALUES
('tpl_new_purchase', 'NEW_PURCHASE', 'New Course Purchase',
 'New Course Purchase — {{student_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">New Course Purchase</h2><p>A student submitted a new course purchase.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Student</b></td><td style="padding:6px 0">{{student_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Phone</b></td><td style="padding:6px 0">{{student_phone}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Email</b></td><td style="padding:6px 0">{{student_email}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course</b></td><td style="padding:6px 0">{{course_name}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Course Type</b></td><td style="padding:6px 0">{{course_type}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>License</b></td><td style="padding:6px 0">{{license_class}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Original Price</b></td><td style="padding:6px 0">{{original_price}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Discount</b></td><td style="padding:6px 0">{{discount_amount}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Final Price</b></td><td style="padding:6px 0">{{final_price}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Payment Status</b></td><td style="padding:6px 0">Pending confirmation</td></tr></table><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>',
 'New Course Purchase\n\nStudent: {{student_name}}\nPhone: {{student_phone}}\nEmail: {{student_email}}\nCourse: {{course_name}}\nCourse Type: {{course_type}}\nLicense: {{license_class}}\nOriginal Price: {{original_price}}\nDiscount: {{discount_amount}}\nFinal Price: {{final_price}}\nPayment Status: Pending confirmation',
 1, 1, ''),

('tpl_purchase_confirmed', 'PURCHASE_CONFIRMED', 'Purchase Confirmed',
 'Your purchase is confirmed — {{course_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#A21CAF">Purchase Confirmed 🎉</h2><p>Hi {{student_name}},</p><p>Your purchase of <b>{{course_name}}</b> has been confirmed.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:6px 0;color:#667085"><b>Original Price</b></td><td style="padding:6px 0">{{original_price}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Discount</b></td><td style="padding:6px 0">{{discount_amount}}</td></tr><tr><td style="padding:6px 0;color:#667085"><b>Final Price</b></td><td style="padding:6px 0">{{final_price}}</td></tr></table><p>You can now book your lesson time from your dashboard.</p><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>',
 'Purchase Confirmed\n\nHi {{student_name}},\n\nYour purchase of {{course_name}} has been confirmed.\nOriginal Price: {{original_price}}\nDiscount: {{discount_amount}}\nFinal Price: {{final_price}}\n\nYou can now book your lesson time from your dashboard.',
 1, 1, ''),

('tpl_payment_rejected', 'PAYMENT_REJECTED', 'Payment Rejected',
 'Payment update — {{course_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#E5484D">Payment Update</h2><p>Hi {{student_name}},</p><p>Your payment for <b>{{course_name}}</b> was not confirmed. Please contact the instructor to resolve this.</p><p style="color:#667085;font-size:13px">— EZDRIVES</p></div>',
 'Payment Update\n\nHi {{student_name}},\n\nYour payment for {{course_name}} was not confirmed. Please contact the instructor.',
 1, 1, ''),

('tpl_lesson_completed', 'LESSON_COMPLETED', 'Lesson Completed',
 'Lesson {{lesson_number}} completed — {{course_name}}',
 '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2 style="color:#22A06B">Lesson Completed ✅</h2><p>Hi {{student_name}},</p><p>Lesson <b>{{lesson_number}}</b> ({{lesson_title}}) of <b>{{course_name}}</b> has been marked complete by your instructor.</p><p>Your next lesson is now available to book.</p><p style="color:#667085;font-size:13px">— EZDRIVES · {{website_url}}</p></div>',
 'Lesson Completed\n\nHi {{student_name}},\n\nLesson {{lesson_number}} ({{lesson_title}}) of {{course_name}} has been marked complete by your instructor.\n\nYour next lesson is now available to book.',
 1, 1, '');
