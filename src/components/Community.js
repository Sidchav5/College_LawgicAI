// Community.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Community.css";
import Navbar from "./Navbar";
import Footer from "./Footer";
import API_BASE_URL from "../config";

export default function Community() {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [commentText, setCommentText] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPost, setExpandedPost] = useState(null);
  const [currentUser, setCurrentUser] = useState("");
  const [showComments, setShowComments] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setError("Please log in to access the community");
      setTimeout(() => navigate("/login"), 2000);
      return;
    }
    fetchUserInfo();
    fetchPosts();
  }, [token, navigate]);

  const fetchUserInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        const username = data.name || data.email?.split('@')[0] || "User";
        setCurrentUser(username);
        localStorage.setItem("username", username);
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
      const fallback = localStorage.getItem("username") || 
                      localStorage.getItem("email")?.split('@')[0] || 
                      "User";
      setCurrentUser(fallback);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/community/posts`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setPosts(data.posts || []);
      } else {
        setError(data.error || "Failed to load posts");
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!newPost.title.trim()) {
      setError("Please enter a post title");
      setIsSubmitting(false);
      return;
    }
    if (!newPost.content.trim()) {
      setError("Please enter post content");
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("title", newPost.title.trim());
    formData.append("content", newPost.content.trim());
    if (selectedFile) formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/community/post`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setNewPost({ title: "", content: "" });
        setSelectedFile(null);
        setPosts([data.post, ...posts]);
        setSuccess("Post created successfully!");
        setTimeout(() => setSuccess(""), 3000);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setError(data.error || "Failed to create post");
      }
    } catch (err) {
      console.error("Error creating post:", err);
      setError("Failed to create post: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComment = async (postId) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/community/comment/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (data.success) {
        const updatedPosts = posts.map((p) =>
          p._id === postId ? { ...p, comments: data.comments } : p
        );
        setPosts(updatedPosts);
        setCommentText({ ...commentText, [postId]: "" });
        setSuccess("Comment added!");
        setTimeout(() => setSuccess(""), 2000);
      } else {
        setError(data.error || "Failed to add comment");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      setError("Failed to add comment");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/community/like/${postId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
      });

      const data = await res.json();

      if (data.success) {
        const updatedPosts = posts.map((p) =>
          p._id === postId
            ? {
                ...p,
                likes: data.likes,
                likes_count: data.likes,
                liked: data.liked
              }
            : p
        );
        setPosts(updatedPosts);
      }
    } catch (err) {
      console.error("Error liking post:", err);
    }
  };

  const toggleComments = (postId) => {
    setShowComments({
      ...showComments,
      [postId]: !showComments[postId]
    });
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "my-posts") {
      return matchesSearch && post.author === currentUser;
    }
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const getRandomColor = (name) => {
    const colors = [
      '#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
      '#fa709a', '#fee140', '#a18cd1', '#fbc2eb', '#8ec5fc'
    ];
    const index = name?.length % colors.length || 0;
    return colors[index];
  };

  return (
    <>
      <Navbar />
      <div className="community-container">
        {/* Header */}
        <div className="community-header">
          <div className="header-badge">
            <span>Community</span>
          </div>
          <h1 className="community-title">Community Support</h1>
          <p className="community-subtitle">
            Connect with other legal professionals, share experiences, and get help with contract-related questions
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="message-banner error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button className="close-btn" onClick={() => setError("")}>×</button>
          </div>
        )}
        {success && (
          <div className="message-banner success">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
            <button className="close-btn" onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        <div className="community-content">
          {/* Create Post Section */}
          <div className="create-post-section">
            <div className="post-form-card">
              <h3>
                <i className="fas fa-edit"></i> Create New Post
              </h3>
              <form className="post-form" onSubmit={handlePostSubmit}>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Enter post title..."
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    required
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                  <span className="char-count">{newPost.title.length}/100</span>
                </div>

                <div className="form-group">
                  <textarea
                    placeholder="Describe your legal issue, contract question, or share your experience..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    required
                    rows="4"
                    maxLength={1000}
                    disabled={isSubmitting}
                  />
                  <span className="char-count">{newPost.content.length}/1000</span>
                </div>

                <div className="file-upload-section">
                  <label className="file-upload-label">
                    <i className="fas fa-paperclip"></i>
                    Attach Contract File (Optional)
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file && file.size > 16 * 1024 * 1024) {
                          setError("File size must be less than 16MB");
                          setTimeout(() => setError(""), 3000);
                          return;
                        }
                        setSelectedFile(file);
                      }}
                      className="file-input"
                      disabled={isSubmitting}
                    />
                  </label>
                  {selectedFile && (
                    <div className="file-preview">
                      <i className="fas fa-file"></i>
                      <span>{selectedFile.name}</span>
                      <span className="file-size">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        className="remove-file"
                        onClick={() => setSelectedFile(null)}
                        disabled={isSubmitting}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="submit-post-btn"
                  disabled={isSubmitting || !newPost.title.trim() || !newPost.content.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Posting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Publish Post
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Posts Section */}
          <div className="posts-section">
            <div className="posts-header">
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "all" ? "active" : ""}`}
                  onClick={() => setActiveTab("all")}
                >
                  <i className="fas fa-globe"></i> All Posts ({posts.length})
                </button>
                <button
                  className={`tab ${activeTab === "my-posts" ? "active" : ""}`}
                  onClick={() => setActiveTab("my-posts")}
                >
                  <i className="fas fa-user"></i> My Posts ({posts.filter(p => p.author === currentUser).length})
                </button>
              </div>

              <div className="search-box">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading && posts.length === 0 ? (
              <div className="loading-posts">
                <i className="fas fa-spinner fa-spin"></i>
                <p>Loading posts...</p>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="no-posts">
                <i className="fas fa-comments"></i>
                <h3>No posts found</h3>
                <p>
                  {activeTab === "my-posts"
                    ? "You haven't created any posts yet. Create one above!"
                    : searchTerm
                    ? "No posts match your search. Try different keywords."
                    : "Be the first to start a discussion!"}
                </p>
              </div>
            ) : (
              <div className="posts-list">
                {filteredPosts.map((post) => (
                  <div key={post._id} className="post-card">
                    <div className="post-header">
                      <div className="post-meta">
                        <div className="post-author-avatar">
                          <div 
                            className="avatar"
                            style={{ background: getRandomColor(post.author) }}
                          >
                            {getInitials(post.author)}
                          </div>
                          <div className="post-author-info">
                            <span className="post-author">{post.author || "Anonymous"}</span>
                            <span className="post-date">
                              <i className="fas fa-clock"></i> {formatDate(post.createdAt)}
                            </span>
                          </div>
                        </div>
                        <h3 className="post-title">{post.title}</h3>
                      </div>
                      <div className="post-actions">
                        <button
                          className={`like-btn ${post.liked ? "liked" : ""}`}
                          onClick={() => handleLike(post._id)}
                          title={post.liked ? "Unlike" : "Like"}
                        >
                          <i className={`fas fa-heart${post.liked ? '' : '-o'}`}></i>
                          <span>{post.likes_count || post.likes || 0}</span>
                        </button>
                      </div>
                    </div>

                    <div className="post-content">
                      <p>
                        {expandedPost === post._id || post.content.length <= 200
                          ? post.content
                          : `${post.content.substring(0, 200)}...`}
                      </p>
                      {post.content.length > 200 && (
                        <button
                          className="read-more"
                          onClick={() => setExpandedPost(expandedPost === post._id ? null : post._id)}
                        >
                          {expandedPost === post._id ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>

                    {post.fileUrl && (
                      <div className="post-attachment">
                        <a
                          href={`${API_BASE_URL}${post.fileUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          <i className="fas fa-paperclip"></i>
                          View Attached File
                        </a>
                      </div>
                    )}

                    <div className="post-footer">
                      <button
                        className="comments-toggle"
                        onClick={() => toggleComments(post._id)}
                      >
                        <i className="fas fa-comments"></i>
                        {post.comments?.length || 0} Comments
                        <i className={`fas fa-chevron-${showComments[post._id] ? 'up' : 'down'}`}></i>
                      </button>
                    </div>

                    {showComments[post._id] && (
                      <div className="comments-section">
                        <div className="comments-list">
                          {post.comments && post.comments.length > 0 ? (
                            post.comments.map((comment, index) => (
                              <div key={index} className="comment">
                                <div className="comment-header">
                                  <div className="comment-author-info">
                                    <div 
                                      className="comment-avatar"
                                      style={{ background: getRandomColor(comment.user) }}
                                    >
                                      {getInitials(comment.user)}
                                    </div>
                                    <strong className="comment-author">
                                      {comment.user || "Anonymous"}
                                    </strong>
                                  </div>
                                  <span className="comment-date">
                                    {formatDate(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="comment-text">{comment.text}</p>
                              </div>
                            ))
                          ) : (
                            <p className="no-comments">No comments yet. Be the first to comment!</p>
                          )}
                        </div>

                        <div className="comment-box">
                          <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentText[post._id] || ""}
                            onChange={(e) => setCommentText({
                              ...commentText,
                              [post._id]: e.target.value
                            })}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleComment(post._id);
                              }
                            }}
                            maxLength={1000}
                          />
                          <button
                            onClick={() => handleComment(post._id)}
                            disabled={!commentText[post._id]?.trim()}
                            title="Post comment"
                          >
                            <i className="fas fa-paper-plane"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}