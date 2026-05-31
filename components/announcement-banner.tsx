import { client } from "@/sanity/lib/client"

export async function AnnouncementBanner() {
  // Fetch active announcements from Sanity CMS
  const query = `*[_type == "announcement" && isActive == true] | order(_createdAt desc) [0]`
  let announcement = null
  
  try {
    announcement = await client.fetch(query, {}, { next: { revalidate: 60 } })
  } catch (error) {
    console.error("Failed to fetch Sanity announcement:", error)
  }

  if (!announcement) {
    return null
  }

  const bgColor = 
    announcement.type === 'alert' ? 'bg-red-500' :
    announcement.type === 'warning' ? 'bg-amber-500' :
    'bg-blue-500'

  return (
    <div className={`w-full ${bgColor} text-white px-4 py-2 text-sm flex items-center justify-center font-medium shadow-sm`}>
      <span className="mr-2 font-bold">{announcement.title}:</span>
      <span>{announcement.message}</span>
    </div>
  )
}
