const baseStyles = `
  body { margin: 0; padding: 0; background-color: #1c1f26; color: #edede8; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
  .card { background-color: #2a2d36; border: 1px solid #3a3d47; border-radius: 12px; padding: 32px; }
  .logo { color: #6f8d81; font-size: 20px; font-weight: 700; margin-bottom: 24px; }
  h1 { color: #edede8; font-size: 22px; font-weight: 700; margin: 0 0 12px 0; }
  p { color: #8893A8; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
  .highlight { color: #edede8; }
  .badge { display: inline-block; background-color: rgba(111,141,129,0.2); color: #6f8d81; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 500; }
  .quote { background-color: #1c1f26; border-left: 3px solid #6f8d81; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0; font-style: italic; color: #edede8; }
  .btn { display: inline-block; background-color: #6f8d81; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
  .footer { text-align: center; color: #5a6070; font-size: 12px; margin-top: 32px; }
`

function wrap(content) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>${baseStyles}</style></head>
<body>
<div class="container">
  <div class="card">
    <div class="logo">Shepherd Church</div>
    ${content}
    <a href="${appUrl}/dashboard" class="btn">View My Dashboard</a>
  </div>
  <div class="footer">
    <p>Shepherd Church Prayer Ministry</p>
    <p>Your requests are handled with care and confidentiality.</p>
  </div>
</div>
</body>
</html>`
}

export function requestPickedUpTemplate(name, requestTitle) {
  return wrap(`
    <h1>Someone is praying for you</h1>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>A prayer team member has picked up your prayer request and is actively interceding for you.</p>
    <p><span class="badge">${requestTitle}</span></p>
    <p>You may receive prophetic words or encouragement as they pray. Check your dashboard for updates.</p>
  `)
}

export function propheticWordTemplate(name, requestTitle, wordContent) {
  const preview = wordContent.length > 200 ? wordContent.slice(0, 200) + '...' : wordContent
  return wrap(`
    <h1>You received a prophetic word</h1>
    <p>Hi <span class="highlight">${name}</span>,</p>
    <p>A prayer team member has shared a prophetic word for your request:</p>
    <p><span class="badge">${requestTitle}</span></p>
    <div class="quote">${preview}</div>
    <p>Visit your dashboard to read the full message.</p>
  `)
}
