'use client';
import { useEffect, useState, use } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AcceptInvitePage({ params }) {
  const unwrappedParams = use(params);
  const token = unwrappedParams.token;
  
  const { getToken, isLoaded, userId } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  
  const [status, setStatus] = useState("Authenticating...");
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const processInvite = async () => {
      if (!isLoaded) return;
      
      if (!userId) {
        setStatus("Sign in Required");
        setErrorMsg("You must be logged in to accept a project invitation.");
        return;
      }

      setStatus("Joining project...");

      try {
        const clerkToken = await getToken();
        const userEmail = user?.primaryEmailAddress?.emailAddress || "Unknown User";
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/invites/${token}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clerkToken}`
          },
          body: JSON.stringify({ email: userEmail }) 
        });

        const result = await res.json();
        
        if (result.success) {
          setStatus("Success! Teleporting you to the board...");
          router.push(`/project/${result.projectId}`);
        } else {
          setStatus("Invitation Failed");
          setErrorMsg(result.error || "This invite is invalid or has expired.");
        }
      } catch (error) {
        setStatus("Connection Error");
        setErrorMsg("Failed to connect to the server. Please ensure your backend is running.");
      }
    };

    processInvite();
  }, [isLoaded, userId, token, getToken, user, router]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-zinc-200 text-center max-w-md w-full">
        
        <div className="w-16 h-16 bg-violet-100 text-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>

        <h2 className="text-2xl font-extrabold text-zinc-900 mb-2">{status}</h2>
        
        {errorMsg ? (
          <div className="mt-4">
            <p className="text-sm font-medium text-red-500 mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
              {errorMsg}
            </p>
            <Link 
              href="/" 
              className="bg-zinc-800 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-zinc-900 transition-all shadow-sm active:scale-95 inline-block"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="mt-6 flex justify-center">
            <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
          </div>
        )}

      </div>
    </div>
  );
}