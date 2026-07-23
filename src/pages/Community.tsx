import React, { useState, useEffect } from "react";
import api from "../services/api.ts";
import { useAuth } from "../context/AuthContext.tsx";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Lock,
  Unlock,
  ThumbsUp,
  MessageSquare,
  Bookmark,
  Share2,
  Plus,
  Search,
  Award,
  TrendingUp,
  ChevronRight,
  Coins,
  Send,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
  Filter,
  Flame,
  ArrowUpRight,
  Calendar,
  X,
  PlusCircle,
  ShieldAlert,
  Sliders,
  BadgeCheck,
  Image,
  Video,
  Trash2
} from "lucide-react";

export function Community() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"feed" | "leaderboard" | "analytics" | "post">("feed");
  const [posts, setPosts] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalUnlocks: 0,
    followersCount: 0,
    earnedXP: 0,
  });
  const [xpBalance, setXpBalance] = useState<number>(0);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [feedSubTab, setFeedSubTab] = useState<"all" | "post" | "experience" | "events" | "blogs">("all");
  const [postSubTab, setPostSubTab] = useState<"experience" | "blog">("experience");
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<any | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // New Post States
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    type: "Short Experience",
    xp_unlock_cost: 25,
    company_name: "",
    author_role: "STUDENT",
    author_badge: "",
    proof_url: "",
    tags: "",
    image_url: "",
    video_url: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<any>(null);

  // Gemini Scanning & Pre-submit validation warning states
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [isScanningVideo, setIsScanningVideo] = useState(false);
  const [imageVerificationResult, setImageVerificationResult] = useState<{ is_appropriate: boolean; reason: string } | null>(null);
  const [videoVerificationResult, setVideoVerificationResult] = useState<{ is_appropriate: boolean; reason: string } | null>(null);
  const [validationWarning, setValidationWarning] = useState<{ isOpen: boolean; reason: string; suggestions: string } | null>(null);

  // Comments State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<{ [postId: number]: any[] }>({});
  const [newCommentText, setNewCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<{ [postId: number]: boolean }>({});

  // Load Initial Data
  useEffect(() => {
    fetchFeed();
    if (activeTab === "feed" && (feedSubTab === "all" || feedSubTab === "events")) {
      fetchEvents();
    }
    fetchLeaderboard();
    fetchAnalytics();
    fetchXpBalance();
  }, [selectedType, selectedTag, showVerifiedOnly, activeTab, feedSubTab]);

  // Handle Navbar 'Drops' subtabs query routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["all", "post", "experience", "events", "blogs"].includes(tabParam)) {
      setFeedSubTab(tabParam as any);
      setActiveTab("feed");
    }
  }, [window.location.search]);

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const { data } = await api.get("/community/events");
      if (data && data.success) {
        setEvents(data.data || []);
      }
    } catch (e) {
      console.error("Xp balance fetching failed:", e);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleRegisterEvent = async (eventId: number) => {
    try {
      const { data } = await api.post(`/community/events/register/${eventId}`);
      if (data.success) {
        toast.success("Successfully registered for event!");
        // Refresh full list
        fetchEvents();
        // Sync modal local state if it's currently open
        setEvents(prevEvents => {
          return prevEvents.map(e => {
            if (e.id === eventId) {
              const updatedObj = { ...e, registration_count: (e.registration_count || 0) + 1 };
              if (selectedEventDetails && selectedEventDetails.id === eventId) {
                setSelectedEventDetails(updatedObj);
              }
              return updatedObj;
            }
            return e;
          });
        });
      } else {
        toast.error(data.message || "Failed to register");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Already registered for this event!");
    }
  };

  const fetchXpBalance = async () => {
    try {
      const { data } = await api.get("/xp/balance");
      if (data.success) {
        setXpBalance(data.balance.xp_balance);
      }
    } catch (e) {
      console.error("Xp balance fetching failed:", e);
    }
  };

  const fetchFeed = async () => {
    try {
      let url = `/community/feed?search=${searchQuery}`;
      if (selectedType) url += `&type=${selectedType}`;
      if (selectedTag) url += `&tag=${selectedTag}`;
      if (showVerifiedOnly) url += `&is_verified=true`;

      const { data } = await api.get(url);
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (e: any) {
      toast.error("Error fetching career feed");
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data } = await api.get("/community/leaderboard");
      if (data.success) {
        setLeaderboard(data.leaderboard);
      }
    } catch (e) {
      console.error("Leaderboard fetch failed:", e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data } = await api.get("/community/creator/analytics");
      if (data.success) {
        setAnalytics(data.stats);
      }
    } catch (e) {
      console.error("Analytics fetch failed:", e);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) {
      toast.error("Please add a catchy title and content body");
      return;
    }

    setIsSubmitting(true);
    setAiFeedback(null);
    setValidationWarning(null);

    // AI Guardrail Text & Media Sentiment Check before Submit
    try {
      const { data: valResult } = await api.post("/community/posts/validate", {
        title: newPost.title,
        content: newPost.content,
        type: newPost.type,
        image_url: newPost.image_url,
        video_url: newPost.video_url,
      });

      if (valResult.success && valResult.is_positive_and_correct === false) {
        setValidationWarning({
          isOpen: true,
          reason: valResult.warning_reason,
          suggestions: valResult.suggestions,
        });
        toast.error("⚠️ Rejected: Content violates community positivity guidelines");
        setIsSubmitting(false);
        return;
      }
    } catch (vErr: any) {
      console.warn("Pre-submission validation bypass:", vErr);
    }

    try {
      const { data } = await api.post("/community/posts", newPost);
      if (data.success) {
        toast.success("Post published successfully!");
        setAiFeedback(data.aiAnalysis);
        fetchXpBalance();
        // Reset
        setNewPost({
          title: "",
          content: "",
          type: "Short Experience",
          xp_unlock_cost: 25,
          company_name: "",
          author_role: "STUDENT",
          author_badge: "",
          proof_url: "",
          tags: "",
          image_url: "",
          video_url: "",
        });
        setImageVerificationResult(null);
        setVideoVerificationResult(null);
        // Settle view after showing matching AI feedback
        setTimeout(() => {
          setActiveTab("feed");
          setAiFeedback(null);
        }, 5000);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to publish post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlockPost = async (postId: number, cost: number) => {
    if (xpBalance < cost) {
      toast.error("Insufficient XP Balance! Buy/earn some from the VEGA Rewards Center first.");
      return;
    }

    const confirmUnlock = window.confirm(`Unlock this premium content for ${cost} XP?`);
    if (!confirmUnlock) return;

    try {
      const { data } = await api.post(`/community/posts/${postId}/unlock`);
      if (data.success) {
        toast.success("Premium content unlocked!");
        fetchFeed();
        fetchXpBalance();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unlock failed.");
    }
  };

  const handleToggleLike = async (postId: number) => {
    try {
      const { data } = await api.post(`/community/posts/${postId}/like`);
      if (data.success) {
        fetchFeed();
      }
    } catch (e) {
      toast.error("Error processing reaction");
    }
  };

  const handleToggleBookmark = async (postId: number) => {
    try {
      const { data } = await api.post(`/community/posts/${postId}/bookmark`);
      if (data.success) {
        toast.success(data.bookmarked ? "Post saved to bookmarks" : "Post removed from bookmarks");
        fetchFeed();
      }
    } catch (e) {
      toast.error("Error updating save markers");
    }
  };

  const handleFollowUser = async (creatorId: number) => {
    try {
      const { data } = await api.post(`/community/users/${creatorId}/follow`);
      if (data.success) {
        toast.success(data.following ? "Successfully followed contributor!" : "Unfollowed contributor");
        fetchFeed();
        fetchLeaderboard();
      }
    } catch (e) {
      toast.error("Follow operation refused.");
    }
  };

  const handleFetchComments = async (postId: number) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }

    try {
      const { data } = await api.get(`/community/posts/${postId}/comments`);
      if (data.success) {
        setCommentsByPost((prev) => ({ ...prev, [postId]: data.comments }));
        setActiveCommentsPostId(postId);
      }
    } catch (e) {
      toast.error("Could not load comments conversation");
    }
  };

  const handlePostComment = async (postId: number) => {
    if (!newCommentText.trim()) return;

    setIsCommenting(true);
    try {
      const { data } = await api.post(`/community/posts/${postId}/comment`, {
        comment: newCommentText,
      });
      if (data.success) {
        toast.success("Comment published successfully!");
        setNewCommentText("");
        // Reload comments
        const commResponse = await api.get(`/community/posts/${postId}/comments`);
        if (commResponse.data.success) {
          setCommentsByPost((prev) => ({ ...prev, [postId]: commResponse.data.comments }));
        }
        fetchFeed();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to post comment due to safety blocks.");
    } finally {
      setIsCommenting(false);
    }
  };

  const getPostTypeColor = (type: string) => {
    switch (type) {
      case "Short Experience":
        return "from-teal-500/10 to-teal-500/2 bg-teal-500/10 text-teal-300 border-teal-500/20";
      case "Premium Blog":
        return "from-amber-500/10 to-amber-500/2 bg-amber-500/10 text-amber-300 border-amber-500/20";
      case "Company Preparation Guide":
        return "from-purple-500/10 to-purple-500/2 bg-purple-500/10 text-purple-300 border-purple-500/20";
      case "Full Placement Journey":
        return "from-emerald-500/10 to-emerald-500/2 bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      default:
        return "from-blue-500/10 to-blue-500/2 bg-blue-500/10 text-blue-300 border-blue-500/20";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100 min-h-screen">
      {/* 🚀 Dynamic AI Glow Title Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-slate-950 border border-slate-900 shadow-2xl mb-10">
        <div className="absolute inset-0 bg-radial-[circle_at_bottom_right] from-blue-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 p-4 flex gap-2 items-center text-xs font-mono text-slate-500">
          <Coins className="text-amber-500 w-4 h-4 animate-bounce" />
          <span>My Balance:</span>
          <span className="text-amber-400 font-bold text-sm bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
            {xpBalance} XP
          </span>
        </div>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-black uppercase tracking-wider mb-4 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Sparkles size={12} className="animate-pulse" />
            AI-Engine Activated
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 to-slate-400 bg-clip-text text-transparent">
            Career Community <span className="text-blue-400 font-black">&amp;</span> Knowledge Graph
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed font-medium">
            Read peer placement interviews, earn XP incentives for contributing guides, unlock premium expert strategies, and leverage AI content analysis.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-900 mb-8 overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab("feed")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "feed"
              ? "border-blue-500 text-blue-400 font-black"
              : "border-transparent text-slate-400 hover:text-slate-100"
          }`}
        >
          <Flame size={16} />
          Explore Feed
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "leaderboard"
              ? "border-blue-500 text-blue-400 font-black"
              : "border-transparent text-slate-400 hover:text-slate-100"
          }`}
        >
          <Award size={16} />
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === "analytics"
              ? "border-blue-500 text-blue-400 font-black"
              : "border-transparent text-slate-400 hover:text-slate-100"
          }`}
        >
          <TrendingUp size={16} />
          Creator Analytics
        </button>
        <button
          onClick={() => setActiveTab("post")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ml-auto bg-gradient-to-r from-blue-500/10 to-blue-600/10 hover:from-blue-500/20 hover:to-blue-600/20 border border-blue-500/20 text-blue-300 rounded-t-xl`}
        >
          <Plus size={16} />
          Write Placement Story
        </button>
      </div>

      {/* Tabs Layout */}
      <div>
        {/* TAB 1: EXPLORE FEED */}
        {activeTab === "feed" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Filters */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Filter size={14} className="text-blue-400" />
                    Filters
                  </h3>
                  {(searchQuery || selectedType || selectedTag || showVerifiedOnly) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedType("");
                        setSelectedTag("");
                        setShowVerifiedOnly(false);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-blue-400"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Title, skills, company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && fetchFeed()}
                      className="w-full bg-slate-900 text-slate-200 text-sm pl-9 pr-4 py-2 rounded-xl outline-none border border-slate-800 focus:border-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Category Type Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    {feedSubTab === "blogs" ? "Blog Type" : feedSubTab === "events" ? "Event Type" : "Experience Type"}
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-slate-900 text-slate-300 text-sm px-3 py-2 rounded-xl outline-none border border-slate-800 focus:border-blue-500 font-medium cursor-pointer"
                  >
                    {feedSubTab === "blogs" ? (
                      <>
                        <option value="">All Blogs</option>
                        <option value="Premium Blog">Premium Blog (25 XP)</option>
                        <option value="Company Preparation Guide">Company Prep Guide (40 XP)</option>
                      </>
                    ) : feedSubTab === "events" ? (
                      <>
                        <option value="">All Events</option>
                      </>
                    ) : (
                      <>
                        <option value="">All Experiences</option>
                        <option value="Short Experience">Short Experience (10 XP)</option>
                        <option value="Full Placement Journey">Full Placement Story (50 XP)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Popular Trending Tags List */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Trending Topics</label>
                  <div className="flex flex-wrap gap-1.5">
                    {["DSA", "Frontend", "Backend", "Resume", "HR Guidance", "Interview Tips"].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? "" : tag)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          selectedTag === tag
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                            : "bg-slate-905/30 text-slate-400 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verified Only Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Double Verified</span>
                  <button
                    onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      showVerifiedOnly ? "bg-blue-500" : "bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-100 shadow ring-0 transition duration-200 ease-in-out ${
                        showVerifiedOnly ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Creator Rules Card */}
              <div className="bg-slate-950/60 border border-slate-900/60 rounded-2xl p-5 space-y-3 shadow-md">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={14} className="text-yellow-400" />
                  Creator rewards
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  Earn XP balance passively whenever peers double-verify, like (+1 XP), feedback comment (+2 XP), or unlock (+5 XP) your premium content.
                </p>
                <div className="p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-2 text-[11px] font-semibold text-blue-400">
                  <Award size={13} />
                  <span>Verified Mentor Badge = Earn 2X!</span>
                </div>
              </div>
            </div>

            {/* List Feed Area */}
            <div className="lg:col-span-3 space-y-6">
              {/* LinkedIn Segmented SaaS Stream Selector */}
              <div className="bg-slate-900/50 p-1.5 rounded-xl border border-slate-800 flex flex-wrap gap-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => {
                    setFeedSubTab("all");
                    setSelectedType("");
                  }}
                  className={`flex-1 min-w-[80px] py-2.5 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    feedSubTab === "all"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedSubTab("post");
                    setSelectedType("");
                  }}
                  className={`flex-1 min-w-[80px] py-2.5 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    feedSubTab === "post"
                      ? "bg-blue-600 text-white font-black shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  Post
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedSubTab("experience");
                    setSelectedType("");
                  }}
                  className={`flex-1 min-w-[80px] py-2.5 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    feedSubTab === "experience"
                      ? "bg-teal-600 text-white font-black shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  Experience
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedSubTab("events");
                    setSelectedType("");
                  }}
                  className={`flex-1 min-w-[80px] py-2.5 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    feedSubTab === "events"
                      ? "bg-purple-600 text-white font-black shadow-lg animate-pulse"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  <Calendar size={13} />
                  Events
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFeedSubTab("blogs");
                    setSelectedType("");
                  }}
                  className={`flex-1 min-w-[80px] py-2.5 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    feedSubTab === "blogs"
                      ? "bg-amber-500 text-slate-950 font-black shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                  }`}
                >
                  Blogs
                </button>
              </div>

              {(() => {
                // If it is Events view tab
                if (feedSubTab === "events") {
                  if (eventsLoading) {
                    return (
                      <div className="flex flex-col items-center justify-center py-20 bg-slate-950 border border-slate-900 rounded-3xl">
                        <div className="w-10 h-10 border-4 border-slate-800 border-t-purple-500 rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 text-sm font-semibold">Fetching all college hackathons and events...</p>
                      </div>
                    );
                  }
                  if (events.length === 0) {
                    return (
                      <div className="bg-slate-950 border border-slate-900 rounded-3xl p-12 text-center shadow-xl space-y-4">
                        <Calendar className="w-12 h-12 text-slate-700 mx-auto" />
                        <p className="text-slate-300 text-lg font-black">No college events posted yet</p>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto">
                          Once any college TPO schedules placement drives, workshops, seminars, or hackathons, they will show up here for everyone.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {events.map((ev: any) => (
                        <motion.div
                          key={ev.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={() => setSelectedEventDetails(ev)}
                          className="bg-slate-950 border border-slate-900 hover:border-purple-900/40 rounded-3xl shadow-xl relative overflow-hidden flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        >
                          {ev.image_url ? (
                            <div className="w-full h-44 relative overflow-hidden select-none">
                              <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" referrerPolicy="no-referrer" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                              <div className="absolute top-3 right-3 z-10">
                                <span className="bg-purple-600/95 text-white backdrop-blur-md border border-purple-500/20 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider">
                                  {ev.event_type}
                                </span>
                              </div>
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="bg-slate-900/90 text-white font-extrabold text-[11px] uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-700/50 shadow-xl">
                                  🔍 Click to View Full poster & Details
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-24 bg-gradient-to-br from-slate-900 to-purple-950/30 relative overflow-hidden select-none border-b border-slate-900 flex items-center justify-center">
                              <Calendar className="text-purple-500/20 w-16 h-16 absolute -right-4 -bottom-4 rotate-12" />
                              <span className="text-xs font-black uppercase tracking-widest text-purple-400">
                                {ev.event_type}
                              </span>
                              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                <span className="bg-slate-900/90 text-white font-extrabold text-[11px] uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-700/50 shadow-xl">
                                  🔍 View Event details
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="p-5 md:p-6 space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-purple-400">
                                  🎓
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-extrabold text-slate-100 group-hover:text-purple-400 transition-colors truncate">{ev.title}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ev.college_name || "Partner College"}</p>
                                </div>
                              </div>

                              <p className="text-xs text-slate-350 font-medium leading-relaxed line-clamp-2">
                                {ev.description}
                              </p>

                              <div className="pt-2 flex flex-col gap-1.5 text-[11px] font-bold text-slate-400">
                                <span className="flex items-center gap-1.5"><Calendar size={13} className="text-purple-400" /> Runs: {new Date(ev.start_date).toLocaleDateString()} {ev.end_date ? `to ${new Date(ev.end_date).toLocaleDateString()}` : ""}</span>
                                {ev.location_or_link && (
                                  <span className="flex items-center gap-1.5 text-blue-400" onClick={(e) => e.stopPropagation()}>
                                    🔗 <a href={ev.location_or_link.startsWith("http") ? ev.location_or_link : `https://${ev.location_or_link}`} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{ev.location_or_link}</a>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-900 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                🔥 {ev.registration_count || 0} Registered
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEventDetails(ev);
                                  }}
                                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl border border-slate-800 hover:border-slate-700 transition-all active:scale-95 cursor-pointer"
                                >
                                  View details
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRegisterEvent(ev.id);
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 cursor-pointer animate-shimmer"
                                >
                                  Register Now
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  );
                }

                const experiencesTypes = ["Short Experience", "Full Placement Journey", "Experience", "Post"];
                const blogsTypes = ["Premium Blog", "Company Preparation Guide", "Blog"];

                const filteredPosts = posts.filter((post: any) => {
                  if (selectedType) {
                    return post.type === selectedType;
                  }
                  if (feedSubTab === "all") {
                    return true;
                  } else if (feedSubTab === "post") {
                    return ["Short Experience", "Post"].includes(post.type);
                  } else if (feedSubTab === "experience") {
                    return experiencesTypes.includes(post.type);
                  } else {
                    return blogsTypes.includes(post.type);
                  }
                });

                if (filteredPosts.length === 0) {
                  return (
                    <div className="bg-slate-950 border border-slate-900 rounded-3xl p-12 text-center shadow-xl space-y-4">
                      <FileText className="w-12 h-12 text-slate-700 mx-auto" />
                      <p className="text-slate-300 text-lg font-black">No {feedSubTab} published yet</p>
                      <p className="text-slate-500 text-sm max-w-sm mx-auto">
                        Be the first one to share! Click "Write Placement Story" above to craft your career insights here.
                      </p>
                    </div>
                  );
                }

                return filteredPosts.map((post: any) => {
                  const isExpanded = expandedPosts[post.id];
                  const shouldTruncate = post.unlocked && post.content?.length > 325;
                  const textToDisplay = shouldTruncate && !isExpanded 
                    ? `${post.content.slice(0, 320)}...` 
                    : post.content;

                  return (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className="bg-slate-950 border border-slate-900 hover:border-slate-800/80 rounded-2xl p-5 md:p-6 shadow-xl transition-all relative"
                    >
                      {/* Recommendation matching badge */}
                      {post.recommendationBoost > 0 && (
                        <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-black px-2.5 py-1 rounded-lg border border-blue-500/15">
                          <CheckCircle size={10} className="text-blue-400 animate-pulse" />
                          <span>{post.recommendationBoost}% Skills Match</span>
                        </div>
                      )}

                      {/* LinkedIn Header: Avatar + Info */}
                      <div className="flex items-start gap-3 mb-4 pr-16">
                        <div className="w-11 h-11 rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0">
                          <img 
                            src={post.student_photo || post.creatorPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${post.creatorName || 'user'}`} 
                            alt="Contributor Profile" 
                            referrerPolicy="no-referrer" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <span className="font-extrabold text-sm text-slate-100 hover:text-blue-400 transition-colors cursor-pointer">{post.creatorName}</span>
                            {post.is_verified > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] uppercase font-black px-1.5 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded">
                                <BadgeCheck size={9} className="fill-blue-400 text-slate-950" /> Double Verified
                              </span>
                            )}
                            {post.author_badge && (
                              <span className="text-[9px] font-extrabold text-slate-400 px-1.5 py-0.5 bg-slate-900 border border-slate-850 rounded">
                                {post.author_badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                            {post.author_role === "STUDENT" ? "🎓 Career Aspirant" : `💼 ${post.author_role}`}
                            <span className="mx-1 text-slate-600">•</span>
                            <span className="text-slate-500">{new Date(post.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      {/* Content Tags & Topic Row */}
                      <div className="flex flex-wrap gap-1.5 mb-3.5">
                        <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded border ${getPostTypeColor(post.type)}`}>
                          {post.type}
                        </span>
                        {post.company_name && (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/20 px-2 py-0.5 rounded">
                            🏢 {post.company_name}
                          </span>
                        )}
                        {post.tags &&
                          post.tags.split(",").map((t: string) => (
                            <span key={t} className="text-[9px] font-bold text-slate-400 bg-slate-900/60 border border-slate-850 px-1.5 py-0.5 rounded">
                              #{t.trim()}
                            </span>
                          ))}
                      </div>

                      {/* Post Catchy Title */}
                      <h3 className="text-base sm:text-lg font-black text-slate-50 leading-snug tracking-tight mb-2 hover:text-blue-400 transition-colors cursor-pointer">
                        {post.title}
                      </h3>

                      {/* LinkedIn Scroll Text Block with see-more truncation */}
                      <div className="text-slate-300 text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {post.unlocked ? (
                          <div className="space-y-4">
                            <div>
                              <span>{textToDisplay}</span>
                              {shouldTruncate && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !isExpanded }))}
                                  className="text-xs text-blue-400 hover:text-blue-300 font-black ml-1.5 cursor-pointer inline-block"
                                >
                                  {isExpanded ? "Show less" : "...see more"}
                                </button>
                              )}
                            </div>

                            {/* Only Experiences show image/video media files */}
                            {experiencesTypes.includes(post.type) && (
                              <>
                                {post.image_url && (
                                  <div className="relative rounded-xl overflow-hidden border border-slate-850 bg-slate-950 flex items-center justify-center p-1.5 mt-3 shadow-inner max-h-[400px]">
                                    <img 
                                      src={post.image_url} 
                                      alt="Experience attachments" 
                                      className="max-h-[380px] object-contain rounded-lg w-full"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                )}
                                {post.video_url && (
                                  <div className="relative rounded-xl overflow-hidden border border-slate-850 bg-slate-950 flex items-center justify-center p-1.5 mt-3 shadow-inner max-h-[400px]">
                                    <video 
                                      src={post.video_url} 
                                      controls 
                                      className="max-h-[380px] object-contain rounded-lg w-full"
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div>
                            <p className="text-slate-400 italic mb-3">"{post.preview_text}"</p>
                            
                            {/* Locked Files Indication */}
                            {experiencesTypes.includes(post.type) && (post.image_url || post.video_url) && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {post.image_url && (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-0.5 rounded">
                                    <Image size={11} /> Locked Photo Attachment
                                  </span>
                                )}
                                {post.video_url && (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-0.5 rounded">
                                    <Video size={11} /> Locked Video Presentation
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Blur Placeholder Visual */}
                            <div className="relative mt-2 p-3 rounded-lg overflow-hidden bg-slate-950/60 select-none pointer-events-none border border-slate-900/80">
                              <p className="blur-[4px] opacity-10 text-[11px] leading-relaxed">
                                Professional placement strategies, preparation milestones, question lists and answers locked behind security credentials.
                                Unlock this community feed contribution to gain full secure access and reveal full media records.
                              </p>
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
                            </div>

                            {/* Locked Action Trigger button */}
                            <div className="flex justify-center mt-4">
                              <button
                                onClick={() => handleUnlockPost(post.id, post.xp_unlock_cost)}
                                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
                              >
                                <Lock size={12} />
                                Unlock full contribution for {post.xp_unlock_cost} XP
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* AI Evaluation report for unlocked post */}
                      {post.unlocked && post.quality_analysis && (
                        <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-850 flex items-start gap-2.5 text-xs text-blue-300">
                          <Sparkles size={14} className="text-yellow-400 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-amber-300 mr-2">AI Score: {post.content_score}/100</span>
                            <span className="text-slate-400">{post.quality_analysis}</span>
                          </div>
                        </div>
                      )}

                      {/* LinkedIn Social Counts Bar */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-4 pb-2 border-b border-slate-900/50">
                        <span className="hover:text-blue-400 cursor-pointer flex items-center gap-1">
                          👍 {post.likes_count || 0} appreciations
                        </span>
                        <div className="flex gap-2">
                          <span>{post.comments_count || 0} comments</span>
                          <span>•</span>
                          <span>{post.unlock_count || 0} secure unlocks</span>
                        </div>
                      </div>

                      {/* LinkedIn Action Row Buttons */}
                      <div className="grid grid-cols-4 gap-1 mt-2 text-slate-400 text-xs font-bold font-mono">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`py-2 px-1 rounded-lg hover:bg-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            post.has_liked > 0 ? "text-blue-400" : "hover:text-slate-200"
                          }`}
                        >
                          <ThumbsUp size={15} className={post.has_liked > 0 ? "fill-blue-500/10 text-blue-400" : ""} />
                          <span className="hidden sm:inline">Like</span>
                        </button>

                        <button
                          onClick={() => handleFetchComments(post.id)}
                          className={`py-2 px-1 rounded-lg hover:bg-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            activeCommentsPostId === post.id ? "text-blue-400 bg-slate-900/40" : "hover:text-slate-200"
                          }`}
                        >
                          <MessageSquare size={15} />
                          <span className="hidden sm:inline">Comment</span>
                        </button>

                        <button
                          onClick={() => handleToggleBookmark(post.id)}
                          className={`py-2 px-1 rounded-lg hover:bg-slate-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            post.has_bookmarked > 0 ? "text-amber-400" : "hover:text-slate-200"
                          }`}
                        >
                          <Bookmark size={15} className={post.has_bookmarked > 0 ? "fill-amber-500/10 text-amber-400" : ""} />
                          <span className="hidden sm:inline">{post.has_bookmarked > 0 ? "Saved" : "Save"}</span>
                        </button>

                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/community?post=${post.id}`;
                            navigator.clipboard.writeText(link)
                              .then(() => toast.success("Share link copied to clipboard!"))
                              .catch(() => toast.error("Could not copy link"));
                          }}
                          className="py-2 px-1 rounded-lg hover:bg-slate-900 flex items-center justify-center gap-1.5 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <Share2 size={15} />
                          <span className="hidden sm:inline">Share</span>
                        </button>
                      </div>

                      {/* Comments Drawer panel */}
                      <AnimatePresence>
                        {activeCommentsPostId === post.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-slate-900 space-y-3 overflow-hidden"
                          >
                            {/* Write comment input bar */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="Add a professional reply... (Gemini moderated)"
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                className="flex-1 bg-slate-900/80 border border-slate-800 outline-none focus:border-blue-500 text-xs px-3.5 py-2 rounded-xl text-slate-200"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handlePostComment(post.id);
                                }}
                              />
                              <button
                                onClick={() => handlePostComment(post.id)}
                                disabled={isCommenting}
                                className="p-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-800 text-slate-950 rounded-lg transition-all flex items-center justify-center cursor-pointer"
                              >
                                <Send size={12} className="text-white" />
                              </button>
                            </div>

                            {/* Rendered Comments logs loop */}
                            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                              {!commentsByPost[post.id] || commentsByPost[post.id].length === 0 ? (
                                <p className="text-slate-550 text-xs italic pl-1 py-1">No dialogue has been started on this yet.</p>
                              ) : (
                                commentsByPost[post.id].map((comm: any) => (
                                  <div key={comm.id} className="p-2.5 rounded-xl bg-slate-900/50 border border-slate-850 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-700">
                                        <img src={comm.authorPhoto || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${comm.authorName || 'user_comment'}`} referrerPolicy="no-referrer" alt="Author avatar" />
                                      </div>
                                      <span className="text-[10px] font-extrabold text-slate-200">{comm.authorName}</span>
                                      <span className="text-[9px] font-bold text-slate-500">{new Date(comm.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-350 pl-1">{comm.comment}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: CREATOR LEADERBOARDS */}
        {activeTab === "leaderboard" && (
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-4xl mx-auto space-y-6">
            <div className="border-b border-slate-900 pb-4">
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                <Award className="text-yellow-400" />
                Community Leaders Hub
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Top placed seniors, mentors, and experts sorted by cumulative earned community XP reputation and contribution count.
              </p>
            </div>

            <div className="space-y-4">
              {leaderboard.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-8 font-medium">No contributor metrics initialized yet.</p>
              ) : (
                leaderboard.map((leader, index) => (
                  <div
                    key={leader.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-900 border border-slate-800/85 hover:border-slate-800 rounded-2xl gap-4 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank Indicator */}
                      <span className="w-8 text-center text-sm font-extrabold text-slate-400">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </span>

                      {/* Photo url details */}
                      <div className="w-12 h-12 rounded-xl border border-slate-700/60 overflow-hidden bg-slate-950">
                        <img src={leader.photo} alt="PFP" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>

                      {/* Identity description */}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-slate-100 text-sm font-extrabold">{leader.name}</h4>
                          {index < 3 && (
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md">
                              Star Contributor
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-xs">{leader.headline}</p>
                        <p className="text-[10px] text-slate-500 font-bold">
                          {leader.posts} Published Guides
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto sm:ml-0">
                      <div className="text-right">
                        <p className="text-amber-400 font-black text-sm flex items-center justify-end gap-1">
                          <Coins size={12} className="text-amber-400" />
                          {leader.xp} XP
                        </p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Relevance Points</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CREATOR ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-8 max-w-5xl mx-auto">
            {/* Bento statistics grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-950 border border-slate-905 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-50">{analytics.totalPosts}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black">My Published Guides</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-905 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                <div className="p-3.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                  <ThumbsUp size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-50">{analytics.totalLikes}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black">Received Appreciations</p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-905 p-6 rounded-2xl flex items-center gap-4 shadow-xl">
                <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                  <Coins size={20} />
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-400">{analytics.earnedXP} XP</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black">Community Revenue</p>
                </div>
              </div>
            </div>

            {/* Strategy & Rules for Creator Monetization */}
            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 h-40 w-40 bg-radial-[circle_at_top_right] from-blue-500/5 to-transparent pointer-events-none" />
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Sliders size={16} className="text-blue-400" />
                Monetization Structure Guidelines
              </h3>
              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed mb-4 font-semibold">
                By publishing verified mock interviews and placement journey articles on VEGA, you unlock passive revenue. Juniors use their XP to buy access to your premium advice templates.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
                  <span className="text-sm font-black text-slate-200">Like Reaction</span>
                  <p className="text-amber-400 font-extrabold text-sm mt-1">+1 XP</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Funded by community bonuses</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
                  <span className="text-sm font-black text-slate-200">Comment Advice</span>
                  <p className="text-amber-400 font-extrabold text-sm mt-1">+2 XP</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Increases discussion quality</p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/80 text-center">
                  <span className="text-sm font-black text-slate-200">Post Unlocked</span>
                  <p className="text-amber-400 font-extrabold text-sm mt-1">+5 XP</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Direct junior wallet transfer</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PUBLISH ARTICLE */}
        {activeTab === "post" && (
          <div className="bg-slate-950 border border-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-3xl mx-auto relative">
            <div className="absolute right-6 top-6 flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-400 text-[10px] font-black uppercase tracking-wider mb-4">
              <Sparkles size={11} className="animate-spin" />
              Gemini Co-Pilot Live
            </div>

            {/* Segmented Controller for Post Form Types */}
            <div className="bg-slate-900/50 border border-slate-800 p-1 rounded-xl flex gap-1 mb-6 max-w-sm mx-auto shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setPostSubTab("experience");
                  setNewPost(p => ({
                    ...p,
                    type: "Short Experience",
                    image_url: "",
                    video_url: ""
                  }));
                }}
                className={`flex-1 py-2 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  postSubTab === "experience"
                    ? "bg-blue-600 text-white font-black shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                <Flame size={13} className={postSubTab === "experience" ? "text-amber-300 animate-pulse" : ""} />
                Post Experience
              </button>
              <button
                type="button"
                onClick={() => {
                  setPostSubTab("blog");
                  setNewPost(p => ({
                    ...p,
                    type: "Premium Blog",
                    image_url: "",
                    video_url: ""
                  }));
                }}
                className={`flex-1 py-2 text-xs uppercase tracking-wider font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  postSubTab === "blog"
                    ? "bg-amber-500 text-slate-950 font-black shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                <FileText size={13} />
                Write Blog
              </button>
            </div>

            {postSubTab === "experience" ? (
              <div className="border-b border-slate-900 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                  <Flame className="text-orange-400 animate-pulse" size={20} />
                  Draft Placement &amp; Interview Experience
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Share details about interview rounds, preparation timelines, and actual problems asked. Gemini will evaluate your quality rating in real-time, generate curiosity hook lines, and enable image or video uploads securely!
                </p>
              </div>
            ) : (
              <div className="border-b border-slate-900 pb-4 mb-6">
                <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                  <FileText className="text-amber-400" size={20} />
                  Draft Career article or Preparation Guide
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Perfect for generic tech overviews, preparation schedules, or cheat-sheet guides. This is a text-focused blogging environment with image and video file locks disabled.
                </p>
              </div>
            )}

            {/* AI feedback glowing log display */}
            {aiFeedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-blue-500/30 text-xs text-blue-200 space-y-3 mb-6 shadow-[0_0_25px_rgba(59,130,246,0.2)]"
              >
                <div className="flex items-center gap-1.5 text-blue-300 font-extrabold uppercase tracking-widest text-[10px]">
                  <Sparkles size={13} className="text-yellow-400" />
                  Gemini Editor feedback report
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-bold">Catchy Curated Hook Line preview:</span>
                    <p className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-900 mt-1 italic text-slate-100 font-medium">
                      "{aiFeedback.previewText}"
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-slate-400 font-bold">Content Quality rating:</span>
                      <p className="text-sm font-black text-amber-400 mt-0.5">{aiFeedback.contentScore}/100 POINTS</p>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold">Generated topics:</span>
                      <p className="text-slate-300 font-black mt-0.5">{aiFeedback.tags}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-900 text-slate-300 font-medium leading-relaxed">
                  <span className="text-yellow-400 font-bold">Suggestion:</span> {aiFeedback.analysis}
                </div>
              </motion.div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-6">
              {/* Categorization & Pricing Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {postSubTab === "experience" ? "Experience Category Type" : "Blog Category Type"}
                  </label>
                  <select
                    value={newPost.type}
                    onChange={(e) => setNewPost({ ...newPost, type: e.target.value })}
                    className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none border border-slate-800 focus:border-blue-500 font-bold cursor-pointer"
                  >
                    {postSubTab === "experience" ? (
                      <>
                        <option value="Short Experience">Short Experience (Default Cost: 10 XP)</option>
                        <option value="Full Placement Journey">Full Placement Story (Default Cost: 50 XP)</option>
                      </>
                    ) : (
                      <>
                        <option value="Premium Blog">Premium Blog (Default Cost: 25 XP)</option>
                        <option value="Company Preparation Guide">Company Prep Guide (Default Cost: 40 XP)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                    <span>Access Unlock cost Pricing</span>
                    <span className="text-amber-400 font-bold">{newPost.xp_unlock_cost} XP</span>
                  </label>
                  {/* Slider to customize cost visually */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-bold">Free (0)</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={newPost.xp_unlock_cost}
                      onChange={(e) => setNewPost({ ...newPost, xp_unlock_cost: Number(e.target.value) })}
                      className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs text-slate-500 font-bold">100 XP</span>
                  </div>
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {postSubTab === "experience" ? "Experience Title" : "Blog Article Title"}
                </label>
                <input
                  type="text"
                  placeholder={
                    postSubTab === "experience" 
                      ? "e.g., Google SDE-1 placement story after facing 4 rejections" 
                      : "e.g., Complete Dynamic Programming Mastery Plan for FAANG Preparation"
                  }
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none border border-slate-800 focus:border-blue-500 font-bold"
                  required
                />
              </div>

              {/* Company & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Target Company (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., Google, Amazon, Infosys"
                    value={newPost.company_name}
                    onChange={(e) => setNewPost({ ...newPost, company_name: e.target.value })}
                    className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none border border-slate-800 focus:border-blue-500 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Custom Tags (CSV, Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g., DSA, Resume, HR, Java"
                    value={newPost.tags}
                    onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                    className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none border border-slate-800 focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* Proof link verification details */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Offer Verification url/documents link (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Google Drive link to offer letter, selection mail for 'Double Verified' tag"
                  value={newPost.proof_url}
                  onChange={(e) => setNewPost({ ...newPost, proof_url: e.target.value })}
                  className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-2.5 rounded-xl outline-none border border-slate-800 focus:border-blue-500 font-bold"
                />
                <p className="text-[10px] text-slate-500 border-l border-blue-500/30 pl-2">
                  Sharing a proof verification document earns you the "Double Verified Pro" badge, boosting your feed visibility to juniors!
                </p>
              </div>

              {/* Content text */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {postSubTab === "experience" ? "Interview round reviews & questions body" : "Blog Article content body"}
                </label>
                <textarea
                  rows={8}
                  placeholder={
                    postSubTab === "experience" 
                      ? "Draft your detailed interview experience... Outline round difficulty, actual questions asked, resume review parameters, and final advice." 
                      : "Draft your comprehensive prep article... Share detailed blueprints, resource links, memory hacks, or code templates."
                  }
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full bg-slate-900 text-slate-200 text-sm px-4 py-3 rounded-xl outline-none border border-slate-800 focus:border-blue-500 font-medium leading-relaxed"
                  required
                />
              </div>

              {/* Media Attachments Section (Image & Video) - Allowed only for Experiences */}
              {postSubTab === "experience" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-900/40 rounded-2xl border border-slate-800">
                  {/* Image Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>Attached Image</span>
                      {newPost.image_url && (
                        <button
                          type="button"
                          onClick={() => setNewPost(p => ({ ...p, image_url: "" }))}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={10} /> Clear Image
                        </button>
                      )}
                    </label>
                    
                    {newPost.image_url ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-3 min-h-[160px] gap-2">
                        <img 
                          src={newPost.image_url} 
                          alt="Preview" 
                          className="max-h-[110px] object-contain rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        {isScanningImage ? (
                          <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1.5 animate-pulse bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-900/50">
                            <Sparkles size={10} className="animate-spin" /> AI scanning image safety...
                          </div>
                        ) : imageVerificationResult?.is_appropriate ? (
                          <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-900/50 flex items-center gap-1">
                            <CheckCircle size={10} /> Verified Tone Safe by Gemini AI
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div 
                        onClick={() => document.getElementById('community-image-input')?.click()}
                        className="border-2 border-dashed border-slate-800 hover:border-blue-500 bg-slate-950/50 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[160px]"
                      >
                        <input 
                          id="community-image-input"
                          type="file" 
                          accept="image/*"
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 20 * 1024 * 1024) {
                                toast.error("Image file is too large (max 20MB)");
                                return;
                              }
                              const r = new FileReader();
                              r.onloadend = async () => {
                                const base64Str = r.result as string;
                                setNewPost(p => ({ ...p, image_url: base64Str }));
                                
                                setIsScanningImage(true);
                                setImageVerificationResult(null);
                                try {
                                  const { data } = await api.post("/community/posts/validate-media", {
                                    media_url: base64Str,
                                    media_type: "image"
                                  });
                                  if (data.success) {
                                    if (!data.is_appropriate) {
                                      setImageVerificationResult({ is_appropriate: false, reason: data.reason });
                                      toast.error(`⚠️ Image Blocked: ${data.reason}`);
                                      setNewPost(p => ({ ...p, image_url: "" }));
                                    } else {
                                      setImageVerificationResult({ is_appropriate: true, reason: "" });
                                      toast.success("✓ Image verified safe by Gemini AI");
                                    }
                                  }
                                } catch (err) {
                                  console.error("Image validation failed:", err);
                                  setImageVerificationResult(null);
                                } finally {
                                  setIsScanningImage(false);
                                }
                              };
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                        <Image className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-xs font-bold text-slate-300">Select Local Image</p>
                        <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, GIF, WEBP (under 20MB)</p>
                      </div>
                    )}
                  </div>

                  {/* Video Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                      <span>Attached Video</span>
                      {newPost.video_url && (
                        <button
                          type="button"
                          onClick={() => setNewPost(p => ({ ...p, video_url: "" }))}
                          className="text-[10px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={10} /> Clear Video
                        </button>
                      )}
                    </label>

                    {newPost.video_url ? (
                      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center p-3 min-h-[160px] gap-2">
                        <video 
                          src={newPost.video_url} 
                          controls 
                          className="max-h-[110px] object-contain rounded-lg w-full"
                        />
                        {isScanningVideo ? (
                          <div className="text-[10px] text-blue-400 font-bold flex items-center gap-1.5 animate-pulse bg-blue-950/40 px-2.5 py-1 rounded-full border border-blue-900/50">
                            <Sparkles size={10} className="animate-spin" /> AI scanning video safety...
                          </div>
                        ) : videoVerificationResult?.is_appropriate ? (
                          <div className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-900/50 flex items-center gap-1">
                            <CheckCircle size={10} /> Verified Tone Safe by Gemini AI
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div 
                        onClick={() => document.getElementById('community-video-input')?.click()}
                        className="border-2 border-dashed border-slate-800 hover:border-blue-500 bg-slate-950/50 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors min-h-[160px]"
                      >
                        <input 
                          id="community-video-input"
                          type="file" 
                          accept="video/*"
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 20 * 1024 * 1024) {
                                toast.error("Video file is too large (max 20MB)");
                                return;
                              }
                              const r = new FileReader();
                              r.onloadend = async () => {
                                const base64Str = r.result as string;
                                setNewPost(p => ({ ...p, video_url: base64Str }));
                                
                                setIsScanningVideo(true);
                                setVideoVerificationResult(null);
                                try {
                                  const { data } = await api.post("/community/posts/validate-media", {
                                    media_url: base64Str,
                                    media_type: "video"
                                  });
                                  if (data.success) {
                                    if (!data.is_appropriate) {
                                      setVideoVerificationResult({ is_appropriate: false, reason: data.reason });
                                      toast.error(`⚠️ Video Blocked: ${data.reason}`);
                                      setNewPost(p => ({ ...p, video_url: "" }));
                                    } else {
                                      setVideoVerificationResult({ is_appropriate: true, reason: "" });
                                      toast.success("✓ Video verified safe by Gemini AI");
                                    }
                                  }
                                } catch (err) {
                                  console.error("Video validation failed:", err);
                                  setVideoVerificationResult(null);
                                } finally {
                                  setIsScanningVideo(false);
                                }
                              };
                              r.readAsDataURL(file);
                            }
                          }}
                        />
                        <Video className="w-8 h-8 text-slate-500 mb-2" />
                        <p className="text-xs font-bold text-slate-300">Select Local Video</p>
                        <p className="text-[10px] text-slate-500 mt-1">MP4, WEBM, MOV, OGG (under 20MB)</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-850 text-xs text-slate-400 leading-relaxed font-semibold">
                  📝 <span className="font-extrabold text-blue-400">Blogs are text-only format:</span> Media attachment controllers (images and videos) are disabled for Article / Preparation Guide drafts. This keeps blogs extremely clean, uniform, and focused strictly on raw written preparation hacks.
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("feed")}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:opacity-40 text-white font-black text-xs uppercase tracking-wider py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex justify-center items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Sparkles size={14} className="animate-spin" />
                      Gemini Analyzing...
                    </>
                  ) : (
                    <>
                      <Send size={12} />
                      {postSubTab === "experience" ? "Publish Experience Journey" : "Publish Prep Article"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* ⚠️ AI Content Guard - Guidelines Warnings Modal */}
      {validationWarning?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-2xl space-y-4 relative animate-in fade-in-50 zoom-in-95 duration-200">
            <button 
              onClick={() => setValidationWarning(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer bg-slate-800 p-1.5 rounded-full transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight uppercase">AI Content Guard Warning</h3>
                <p className="text-xs text-amber-500/80 font-bold">Positivity & Professionalism Check Failed</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Violation / Reason</span>
                <p className="text-sm text-slate-200 font-bold leading-relaxed mt-1">
                  {validationWarning.reason}
                </p>
              </div>

              {validationWarning.suggestions && (
                <div className="border-t border-slate-800 pt-3">
                  <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">AI Alignment Suggestion</span>
                  <p className="text-xs text-blue-300 font-medium mt-1 leading-relaxed bg-blue-950/20 p-2.5 rounded-xl border border-blue-900/30">
                    💡 {validationWarning.suggestions}
                  </p>
                </div>
              )}
            </div>

            <p className="text-[10px] text-slate-500 text-center leading-normal">
              To publish, please address the warning constraints. Placement-ready scoring algorithms require that all platform blog posts and placement experiences foster a positive, constructive, correct, and professional development community.
            </p>

            <button
              onClick={() => setValidationWarning(null)}
              className="w-full bg-slate-850 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-2xl transition-all cursor-pointer border border-slate-800 hover:border-slate-700"
            >
              Acknowledge & Edit Post
            </button>
          </div>
        </div>
      )}

      {/* 🔮 Event Detail Immersive Modal */}
      {selectedEventDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-5xl bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative my-8 animate-in fade-in-50 zoom-in-95 duration-200">
            
            {/* Absolute close button in upper right */}
            <button
              type="button"
              onClick={() => setSelectedEventDetails(null)}
              className="absolute top-4 right-4 z-40 text-slate-400 hover:text-white cursor-pointer bg-slate-950/90 hover:bg-slate-850 p-2.5 rounded-full transition-all border border-slate-800 hover:border-slate-700 shadow-xl"
            >
              <X size={18} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
              
              {/* Left Side: High Fidelity Poster Section */}
              <div className="md:col-span-5 bg-slate-950 border-r border-slate-800/80 p-6 flex flex-col justify-between relative min-h-[320px] md:min-h-[550px]">
                {selectedEventDetails.image_url ? (
                  <div className="relative w-full h-full min-h-[250px] bg-slate-950/40 overflow-hidden rounded-2xl border border-slate-800/60 flex flex-col items-center justify-center shadow-2xl group flex-1">
                    {/* Ambient Blurred Background Poster (for luxurious branding backdrop) */}
                    <img 
                      src={selectedEventDetails.image_url} 
                      alt="" 
                      className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-40 scale-110 pointer-events-none select-none"
                    />
                    
                    {/* Crisp Real Poster Overlay */}
                    <img 
                      src={selectedEventDetails.image_url} 
                      alt={selectedEventDetails.title} 
                      className="relative z-10 max-w-full max-h-[460px] object-contain rounded-xl hover:scale-[1.02] transition-transform duration-300 shadow-xl cursor-zoom-in"
                      referrerPolicy="no-referrer"
                      onClick={() => setLightboxUrl(selectedEventDetails.image_url)}
                    />

                    {/* Floating Zoom Action Bar */}
                    <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center pointer-events-none">
                      <span className="bg-slate-900/90 text-purple-400 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm group-hover:bg-purple-600 group-hover:text-white transition-all pointer-events-auto cursor-pointer" onClick={() => setLightboxUrl(selectedEventDetails.image_url)}>
                        🔎 View Full Poster
                      </span>
                    </div>
                  </div>
                ) : (
                  // Fallback beautiful banner style if no image exists or is requested
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950/40 via-slate-950 to-purple-950/40 rounded-2xl border border-slate-800/60 flex flex-col items-center justify-center p-6 text-center shadow-inner relative overflow-hidden flex-1">
                    <div className="absolute inset-x-0 -top-12 h-44 bg-gradient-to-b from-purple-500/10 to-transparent blur-3xl" />
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                      <Calendar className="text-purple-400 w-8 h-8" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-purple-400 mb-2">
                      {selectedEventDetails.event_type}
                    </span>
                    <h3 className="text-slate-400 font-extrabold text-sm max-w-[200px]">
                      Campus Academic & Recruiting Program
                    </h3>
                  </div>
                )}
              </div>

              {/* Right Side: Detailed Event Information & Interactive Workflow */}
              <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between space-y-6 bg-slate-900/40 max-h-[600px] overflow-y-auto custom-scrollbar">
                
                {/* Meta details & title heading */}
                <div className="space-y-4">
                  
                  {/* Category labels row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-purple-500/15 text-purple-300 border border-purple-500/25 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider shadow-sm">
                      ✨ {selectedEventDetails.event_type}
                    </span>
                    <span className="bg-slate-800 text-slate-300 border border-slate-700/50 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider shadow-sm flex items-center gap-1">
                      🏢 {selectedEventDetails.college_name || "Partner College"}
                    </span>
                  </div>

                  {/* Header Title */}
                  <div className="space-y-1.5">
                    <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight leading-snug">
                      {selectedEventDetails.title}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Hosted by college administration
                    </p>
                  </div>

                  {/* Grid Fields & Badges for timing parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60 shadow-lg">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Event Start Date</span>
                      <div className="flex items-center gap-2 text-slate-200 font-extrabold text-xs">
                        <Calendar size={13} className="text-purple-400" />
                        <span>{new Date(selectedEventDetails.start_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Event End Date</span>
                      <div className="flex items-center gap-2 text-slate-200 font-extrabold text-xs">
                        <Calendar size={13} className="text-rose-400" />
                        <span>{selectedEventDetails.end_date ? new Date(selectedEventDetails.end_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : "Single Day Event"}</span>
                      </div>
                    </div>

                    {selectedEventDetails.location_or_link && (
                      <div className="space-y-1 sm:col-span-2 border-t border-slate-800/40 pt-3 mt-1">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Location Venue & Link</span>
                        <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                          <span className="text-sm">🔗</span>
                          <a 
                            href={selectedEventDetails.location_or_link.startsWith("http") ? selectedEventDetails.location_or_link : `https://${selectedEventDetails.location_or_link}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline hover:text-blue-300 break-all select-all flex items-center gap-1 text-[11px]"
                          >
                            {selectedEventDetails.location_or_link}
                            <ArrowUpRight size={12} className="opacity-70" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fully formatted and beautifully spaced description block */}
                  <div className="space-y-2">
                    <h4 className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Event Overview / Description</h4>
                    <div className="text-xs md:text-[13px] text-slate-300 font-medium leading-relaxed whitespace-pre-line bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 max-h-[180px] overflow-y-auto custom-scrollbar shadow-inner">
                      {selectedEventDetails.description || "No description provided."}
                    </div>
                  </div>

                </div>

                {/* Registration workflow action panel at the very bottom */}
                <div className="mt-auto border-t border-slate-800/80 pt-5 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gradient-to-r from-purple-950/15 via-slate-900 to-indigo-950/15 border border-purple-900/30 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-lg shadow-inner">
                        🔥
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registration Status</p>
                        <p className="text-xs font-bold text-purple-300">
                          {selectedEventDetails.registration_count || 0} Registered Candidates
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setSelectedEventDetails(null)}
                        className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRegisterEvent(selectedEventDetails.id)}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg hover:shadow-purple-500/10 transition-all active:scale-95 cursor-pointer"
                      >
                        Register Now
                      </button>
                    </div>
                  </div>
                </div>

              </div>
              
            </div>

          </div>
        </div>
      )}

      {/* 🔍 Poster Lightbox Modal */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 transition-all duration-300 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col justify-center items-center">
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
              className="absolute -top-12 right-0 md:-right-12 text-slate-400 hover:text-white bg-slate-910 border border-slate-800 p-2.5 rounded-full transition-all flex items-center justify-center shadow-2xl cursor-pointer"
            >
              <X size={20} />
            </button>
            <img 
              src={lightboxUrl} 
              alt="Full Poster Zoom" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-slate-800/85 pointer-events-auto cursor-default animate-in fade-in-50 zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

    </div>
  );
}
