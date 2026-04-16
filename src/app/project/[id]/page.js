'use client';
import { useState, useEffect, use } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProjectBoard({ params }) {
  const unwrappedParams = use(params);
  const projectId = unwrappedParams.id;

  const { getToken } = useAuth();
  const [issues, setIssues] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const router = useRouter();
  
  const [projectName, setProjectName] = useState("Loading Project...");
  const [teamMembers, setTeamMembers] = useState([]);

  const { user } = useUser();
  const [newComment, setNewComment] = useState(""); 

  const columns = ['To Do', 'In Progress', 'Done'];
  const BASE_URL=process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      try {
        const token = await getToken();
        
        const issuesRes = await fetch(`${BASE_URL}/api/projects/${projectId}/issues`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const issuesResult = await issuesRes.json();
        
        if (issuesResult.success && Array.isArray(issuesResult.data)) {
          const validIssues = issuesResult.data.filter(issue => issue && issue._id && issue.title);
          setIssues(validIssues);
        }

        const projectRes = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const projectResult = await projectRes.json();
        if (projectResult.success && projectResult.data) {
          setProjectName(projectResult.data.name || "Project Board");
          setTeamMembers(projectResult.data.members || []);
        } else {
          setProjectName("Project Board");
        }
        
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setProjectName("Project Board");
      }
    };
    fetchData();
  }, [projectId, getToken]);

  const handleDragStart = (e, issueId) => {
    e.dataTransfer.setData('issueId', issueId);
  };

  const handleDrop = async (e, newStatus) => {
    const issueId = e.dataTransfer.getData('issueId');
    const token = await getToken();

    setIssues(prev => prev.map(issue => 
      issue._id === issueId ? { ...issue, status: newStatus } : issue
    ));

    await fetch(`${BASE_URL}/api/issues/${issueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
  };

  const handleCreateIssue = async (e) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: newTaskTitle, projectId: projectId, status: 'To Do' })
    });

    const result = await res.json();
    if (result.success && result.data && result.data._id) {
      setIssues([...issues, result.data]);
      setNewTaskTitle(""); 
    } else {
      alert("Failed to create task! Check backend console.");
    }
  };

  const handleUpdateIssue = async (e) => {
    e.preventDefault();
    const token = await getToken();

    const res = await fetch(`${BASE_URL}/api/issues/${selectedIssue._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(selectedIssue) 
    });

    const result = await res.json();
    if (result.success) {
      setIssues(issues.map(iss => iss._id === selectedIssue._id ? selectedIssue : iss));
      setSelectedIssue(null); 
    }
  };

  const handleDeleteIssue = async () => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/issues/${selectedIssue._id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    if (result.success) {
      setIssues(issues.filter(iss => iss._id !== selectedIssue._id));
      setSelectedIssue(null); 
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm("Are you absolutely sure you want to delete this ENTIRE project and all its tasks? This cannot be undone.")) return;
    
    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    const result = await res.json();
    if (result.success) {
      router.push('/'); 
    } else {
      alert("Failed to delete project: " + result.error);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail })
    });

    const result = await res.json();
    if (result.success) {
      alert("Invite Sent!");
      setInviteEmail("");
    }
  };

  const filteredIssues = issues.filter(issue => 
    issue && issue.title && issue.title.toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment) return;

    const token = await getToken();
    const authorName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Team Member";

    const res = await fetch(`${BASE_URL}/api/issues/${selectedIssue._id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: newComment, authorName })
    });

    const result = await res.json();
    if (result.success) {
      setSelectedIssue(result.data); 
      setIssues(issues.map(iss => iss._id === selectedIssue._id ? result.data : iss));
      setNewComment(""); 
    }
  };

  return (
    <div className="p-8 bg-zinc-50 min-h-screen font-sans">
      
      {/* Header */}
      <div className="mb-8">
        <Link href="/" className="text-violet-600 hover:text-violet-800 text-sm font-medium flex items-center mb-4 transition-colors w-fit">
          &larr; Back to Dashboard
        </Link>
        
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
           <div className="flex items-center gap-4">
              <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">{projectName}</h1>
              <button 
                onClick={handleDeleteProject} 
                className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md transition-colors border border-red-100"
              >
                Delete Project
              </button>
            </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <input 
              type="text" 
              placeholder="Search issues..." 
              className="border border-zinc-300 bg-white p-2.5 rounded-lg text-sm w-full lg:w-64 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-zinc-900 placeholder-zinc-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            
            <form onSubmit={handleInvite} className="flex gap-2">
              <input 
                type="email" 
                placeholder="Invite member by email..." 
                className="border border-zinc-300 bg-white p-2.5 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-zinc-900 placeholder-zinc-400"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <button type="submit" className="bg-white border border-zinc-300 text-zinc-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-50 hover:text-zinc-900 shadow-sm transition-all active:scale-95">
                Invite
              </button>
            </form>

            <form onSubmit={handleCreateIssue} className="flex gap-2">
              <input 
                type="text" 
                placeholder="New task title..." 
                className="border border-zinc-300 bg-white p-2.5 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all text-zinc-900 placeholder-zinc-400"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
              <button type="submit" className="bg-violet-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm transition-all active:scale-95">
                Add Task
              </button>
            </form>
          </div>
        </div>
      </div>

      {/*KANBAN*/}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {columns.map(status => (
          <div 
            key={status} 
            className="flex-1 min-w-[320px] bg-zinc-100/60 border border-zinc-200/60 p-4 rounded-2xl min-h-[500px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center mb-4 ml-1">
              <h2 className="font-bold text-sm tracking-wide uppercase text-zinc-500">{status}</h2>
              <span className="ml-2 bg-zinc-200 text-zinc-600 py-0.5 px-2.5 rounded-full text-xs font-semibold">
                {filteredIssues.filter(i => i && i.status === status).length}
              </span>
            </div>

            {filteredIssues
              .filter(issue => issue && issue.status === status)
              .map(issue => (
                <div 
                  key={issue._id} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, issue._id)}
                  onClick={() => setSelectedIssue(issue)}
                  className="bg-white p-4 mb-3 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-violet-300 transition-all duration-200 cursor-grab active:cursor-grabbing group"
                >
                  <h3 className="font-semibold text-zinc-800 text-sm leading-tight group-hover:text-violet-700 transition-colors">{issue.title}</h3>
                  <div className="flex justify-between items-center mt-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${issue.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-zinc-100 text-zinc-600 border border-zinc-200'}`}>
                      {issue.priority || 'Low'}
                    </span>

                    {issue.assignee && issue.assignee !== 'Unassigned' && (
                      <div className="flex items-center gap-1.5 bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-100 transition-colors hover:bg-violet-100">
                        <div className="w-4 h-4 bg-violet-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                          {issue.assignee.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-xs pr-0.5">{issue.assignee}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      {/*EDIT TICKET MODAL */}
      {selectedIssue && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Edit Issue</h2>
              <button onClick={() => setSelectedIssue(null)} className="text-zinc-400 hover:text-zinc-800 font-bold text-2xl transition-colors">
                &times;
              </button>
            </div>
            
            <form onSubmit={handleUpdateIssue} className="overflow-y-auto pr-2 custom-scrollbar">
              <div className="mb-5">
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Title</label>
                <input 
                  type="text" 
                  className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                  value={selectedIssue.title || ""}
                  onChange={(e) => setSelectedIssue({...selectedIssue, title: e.target.value})}
                  required
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Assignee</label>
                <select 
                  className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
                  value={selectedIssue.assignee || "Unassigned"}
                  onChange={(e) => setSelectedIssue({...selectedIssue, assignee: e.target.value})}
                >
                  <option value="Unassigned">Unassigned</option>
                  {teamMembers.map((member, index) => {
                    const memberName = typeof member === 'string' ? member : (member.email || member.name || member.clerkUserId || `User ${index + 1}`);
                    
                    return (
                      <option key={index} value={memberName}>
                        {memberName} {member.role ? `(${member.role})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="mb-5 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Status</label>
                  <select 
                    className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
                    value={selectedIssue.status || "To Do"}
                    onChange={(e) => setSelectedIssue({...selectedIssue, status: e.target.value})}
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Priority</label>
                  <select 
                    className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all cursor-pointer"
                    value={selectedIssue.priority || "Low"}
                    onChange={(e) => setSelectedIssue({...selectedIssue, priority: e.target.value})}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-zinc-700 mb-1.5">Description</label>
                <textarea 
                  className="w-full border border-zinc-300 bg-white p-2.5 rounded-lg h-32 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all resize-none"
                  placeholder="Add a more detailed description..."
                  value={selectedIssue.description || ""}
                  onChange={(e) => setSelectedIssue({...selectedIssue, description: e.target.value})}
                ></textarea>
              </div>

              {/* COMMENTS */}
              <div className="mb-6 border-t border-zinc-200 pt-6">
                <h3 className="text-lg font-bold mb-4 text-zinc-900">Activity</h3>
                
                <div className="space-y-4 mb-5">
                  {(!selectedIssue.comments || selectedIssue.comments.length === 0) ? (
                    <p className="text-sm text-zinc-500 italic bg-zinc-50 p-4 rounded-lg border border-zinc-100">No comments yet. Start the discussion!</p>
                  ) : (
                    selectedIssue.comments.map((comment, index) => (
                      <div key={index} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="font-bold text-sm text-violet-700">{comment.authorName}</span>
                          <span className="text-xs font-medium text-zinc-400">
                            {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed">{comment.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 border border-zinc-300 bg-white p-2.5 rounded-lg text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddComment(e); } }}
                  />
                  <button 
                    type="button" 
                    onClick={handleAddComment}
                    className="bg-zinc-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-900 transition-all shadow-sm active:scale-95"
                  >
                    Post
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-between items-center border-t border-zinc-200 pt-6 mt-4">
                <button 
                  type="button" 
                  onClick={handleDeleteIssue}
                  className="text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-lg text-sm font-bold transition-all"
                >
                  Delete Issue
                </button>
                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => setSelectedIssue(null)}
                    className="bg-white border border-zinc-300 text-zinc-700 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 shadow-sm transition-all active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}