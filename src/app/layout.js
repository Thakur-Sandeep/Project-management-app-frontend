import { ClerkProvider, SignInButton, UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server'; // Import server-side auth
import './globals.css';

export default async function RootLayout({ children }) {
  const { userId } = await auth();

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header className="flex justify-between p-4 bg-gray-900 text-white items-center">
            <h1 className="font-bold text-xl">Project Manangement App</h1>
            <div>
              {userId ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <SignInButton mode="modal" className="bg-blue-600 px-4 py-2 rounded text-sm" />
              )}
            </div>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}