import { Resend } from 'resend'
import { requestPickedUpTemplate, propheticWordTemplate } from './email-templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'prayer@shepherdchurch.com'

export async function sendPickupEmail(requestId, serviceClient) {
  try {
    // Look up the request and visitor
    const { data: req } = await serviceClient
      .from('prayer_requests')
      .select('title, visitor_id')
      .eq('id', requestId)
      .single()

    if (!req) return

    const { data: visitor } = await serviceClient
      .from('visitors')
      .select('email, display_name, email_notifications')
      .eq('id', req.visitor_id)
      .single()

    if (!visitor || !visitor.email_notifications) return

    await resend.emails.send({
      from: `Shepherd Church Prayer <${fromEmail}>`,
      to: visitor.email,
      subject: 'Someone is praying for you',
      html: requestPickedUpTemplate(visitor.display_name, req.title),
    })
  } catch (err) {
    console.error('Failed to send pickup email:', err)
  }
}

export async function sendPropheticWordEmail(requestId, wordContent, serviceClient) {
  try {
    const { data: req } = await serviceClient
      .from('prayer_requests')
      .select('title, visitor_id')
      .eq('id', requestId)
      .single()

    if (!req) return

    const { data: visitor } = await serviceClient
      .from('visitors')
      .select('email, display_name, email_notifications')
      .eq('id', req.visitor_id)
      .single()

    if (!visitor || !visitor.email_notifications) return

    await resend.emails.send({
      from: `Shepherd Church Prayer <${fromEmail}>`,
      to: visitor.email,
      subject: 'You received a prophetic word',
      html: propheticWordTemplate(visitor.display_name, req.title, wordContent),
    })
  } catch (err) {
    console.error('Failed to send prophetic word email:', err)
  }
}
