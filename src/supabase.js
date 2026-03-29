import { createClient } from '@supabase/supabase-js'
 
const url = 'https://ijcudmweioyetpttzzne.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqY3VkbXdlaW95ZXRwdHR6em5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjU3NDAsImV4cCI6MjA5MDE0MTc0MH0.Rzn8DZ3fQT3iXGjz0Pjb9QeQV-e0A1qilKPqqPbC1Wc'
 
export const supabase = createClient(url, key)
