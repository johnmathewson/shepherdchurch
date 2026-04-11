export default function ErrorAlert({ message }) {
  if (!message) return null
  return (
    <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
      {message}
    </div>
  )
}
