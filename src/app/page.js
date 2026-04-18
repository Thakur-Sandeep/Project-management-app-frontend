'use client';
import { useState, useEffect } from 'react';
import { useAuth, useUser} from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const { getToken, isLoaded, userId } = useAuth();
  const router = useRouter(); 
  const {user}=useUser();
  const [projects, setProjects] = useState([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const BASE_URL=process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchProjects = async () => {
      if (!userId) return; 
      try {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/projects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const result = await res.json();
        
        if (result.success && Array.isArray(result.data)) {
          const validProjects = result.data.filter(project => project && project._id);
          setProjects(validProjects);
        }
      } catch (error) {
        console.error("Failed to fetch projects:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [userId, getToken]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectName) return;

    const token = await getToken();
    const userEmail = user?.primaryEmailAddress?.emailAddress || "Unknown User";
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name: newProjectName, email: userEmail })
    });

    const result = await res.json();
    if (result.success) {
      router.push(`/project/${result.data._id}`);
    } else {
      alert("Error creating project: " + result.error);
    }
  };

  const handleDeleteProject = async (projectId, projectName) => {
    if (!confirm(`Are you absolutely sure you want to delete "${projectName}" and all its tasks?`)) return;
    
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    if (result.success) {
      setProjects(projects.filter(p => p._id !== projectId));
    } else {
      alert("Failed to delete project: " + result.error);
    }
  };

  if (!isLoaded || !userId) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-zinc-500 font-medium">Please Sign In to view your projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans pb-12">
      <div className="max-w-5xl mx-auto p-8 pt-12">
        
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-zinc-900 tracking-tight">Your Workspace</h1>
          <p className="text-zinc-500 mt-2">Manage your projects and collaborate with your team.</p>
        </div>

        {/* CREATE PROJECT */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-zinc-200 mb-10">
          <h3 className="text-lg font-bold mb-4 text-zinc-900">Start a new project</h3>
          <form onSubmit={handleCreateProject} className="flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              placeholder="e.g. Website Redesign, Alpha Launch..." 
              className="border border-zinc-300 bg-white p-3 rounded-xl flex-1 text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
            <button 
              type="submit" 
              className="bg-violet-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-violet-700 shadow-sm transition-all active:scale-95 whitespace-nowrap"
            >
              Create Project
            </button>
          </form>
        </div>

        {/* PROJECT LIST */}
        <div>
          <h3 className="text-xl font-bold text-zinc-900 mb-6">Recent Projects</h3>
          
          {isLoading ? (
            <div className="text-zinc-500">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="bg-zinc-100 border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center">
              <p className="text-zinc-500 font-medium">You don't have any active projects yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map(project => (
                <div 
                  key={project._id}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 group flex flex-col overflow-hidden"
                >
                  <div className="p-6 pb-0 flex justify-between items-start">
                    <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center font-bold text-xl border border-violet-100">
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteProject(project._id, project.name)}
                      className="text-zinc-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      Delete
                    </button>
                  </div>
                  <Link 
                    href={`/project/${project._id}`} 
                    className="p-6 pt-4 flex-1 cursor-pointer block"
                  >
                    <h3 className="text-xl font-bold text-zinc-900 group-hover:text-violet-600 transition-colors leading-tight">
                      {project.name}
                    </h3>
                    <p className="text-sm font-medium text-zinc-400 mt-2">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}