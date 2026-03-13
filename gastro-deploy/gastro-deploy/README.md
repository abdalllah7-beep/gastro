# Gastro MCQ Bank - Vercel Deployment

## Quick Deploy Instructions

### Option 1: GitHub + Vercel (Recommended)

1. Create a new GitHub repository
2. Upload ALL files from this folder to the repository
3. Go to [vercel.com](https://vercel.com)
4. Click "New Project" → Import your GitHub repository
5. Click "Deploy" - no environment variables needed!

### Option 2: Drag & Drop to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Drag and drop this entire folder
3. Wait for deployment to complete

## Access Information

- **User Password**: `good939ramadan`
- **Admin Panel**: Add `?admin=true` to your URL (e.g., `https://your-site.vercel.app/?admin=true`)
- **Admin Password**: `gastro_secure_admin_2024_xK9mP2nQ`

## Important Notes

- This version uses in-memory storage for progress (resets on server restart)
- User progress is also saved in browser sessionStorage
- No database setup required - works immediately!
- 7-day access expiration from first login

## File Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main app
│   │   ├── layout.tsx        # Layout
│   │   ├── globals.css       # Styles
│   │   └── api/              # API routes
│   ├── components/ui/        # UI components
│   ├── lib/                  # Utilities
│   └── hooks/                # React hooks
├── public/                   # Static assets
├── questions.json            # 300 MCQ questions
├── package.json              # Dependencies
├── next.config.ts            # Next.js config
└── vercel.json               # Vercel config
```

## Troubleshooting

If you get a 404 error:
1. Make sure ALL files are uploaded (especially `questions.json`)
2. Check Vercel build logs for errors
3. Try redeploying from Vercel dashboard

## Support

For issues, check the Vercel deployment logs in your project dashboard.
