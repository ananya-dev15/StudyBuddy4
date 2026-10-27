import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppContext } from "../context/AppContext";
import Navbar from "./Navbar";
import PageIntroCard from "./PageIntroCard";
import profileIcon from '../assets/profile_icon.png';
import API_BASE from "../services/apiBase";
import avatar1 from '../assets/avatars/avatar1.jpg';
import avatar2 from '../assets/avatars/avatar2.jpg';
import avatar3 from '../assets/avatars/avatar3.jpg';
import avatar4 from '../assets/avatars/avatar4.jpg';
import avatar5 from '../assets/avatars/avatar5.jpg';
import avatar6 from '../assets/avatars/avatar6.jpg';
import avatar7 from '../assets/avatars/avatar7.jpg';
import avatar8 from '../assets/avatars/avatar8.jpg';
import avatar9 from '../assets/avatars/avatar9.jpg';

const initialBlogPosts = [
    {
        id: 1,
        title: "AI is Changing the Way We Learn!",
        author: "Ananya Sharma",
        image: avatar1,
        excerpt: "ISRO’s latest space mission reminds us how science, teamwork, and dreams can take India and young minds beyond the stars.",
        fullContent: "Today I came across an AI-powered study app that tracks your focus level, mood, and even how long you stay distracted — and then creates a personalized study plan for you! It felt like having a private digital mentor who actually understands how your brain works. The app suggested short breaks when my attention dropped and encouraged me to revise difficult topics when my mind was fresh. I realized that artificial intelligence isn’t just about robots or coding — it’s about making learning smarter, faster, and more human. The future classrooms might not even need fixed timetables; they’ll adjust to how we learn best. Isn’t that amazing? 🤖✨"
    },
    {
        id: 2,
        title: "India’s Rocket Launch – What a Proud Moment!",
        author: "Rajesh Kumar",
        image: avatar2,
        excerpt: "ISRO’s latest space mission reminds us how science, teamwork, and dreams can take India and young minds beyond the stars.!",
        fullContent: "Last night, I watched ISRO’s latest rocket launch live on YouTube, and I couldn’t take my eyes off the screen! The countdown, the fire, the takeoff — it was pure magic. The scientists behind it worked for months, maybe years, for those few incredible seconds. It made me think about how much patience and teamwork science really needs. Every small calculation matters. Watching that rocket fly into space gave me goosebumps and filled me with pride. It reminded me that when we study hard and stay curious, we too can reach for the stars — literally! 🌌🇮🇳"
    },
    {
        id: 3,
        title: "Climate Change: Our Responsibility Too",
        author: "Rishabh Singh",
        image: avatar3,
        excerpt: "Global warming is rising faster than ever — and it’s time for students to lead change through awareness, innovation, and daily eco-friendly habits.",
        fullContent: "While researching for my environmental science project, I found out that 2025 has already recorded some of the hottest months in human history. Forest fires, melting glaciers, and rising sea levels are no longer distant headlines — they’re happening right now. It honestly made me pause and think: if we, the students of today, don’t take responsibility, who will? I’ve started doing small things like using metal bottles instead of plastic, turning off lights when not needed, and encouraging my friends to do the same. These small habits may seem minor, but together they can make a big difference. 🌱💚"
    },
    {
        id: 4,
        title: "Imagine Studying in the Metaverse!",
        author: "Anjilesh Sharma",
        image: avatar4,
        excerpt: "Virtual classrooms in the metaverse will let students explore planets, atoms, and history like real-life adventures — turning learning into pure experience.",
        fullContent: "I read this fascinating article about the future of virtual education, and it blew my mind. Imagine wearing a VR headset and attending a biology class inside a 3D model of the human body, or learning about planets while floating in a simulated solar system! That’s what metaverse learning promises — immersive, interactive, and super fun classes. You wouldn’t just read about a volcano; you’d actually walk around one (virtually). This idea made me realize how learning could soon become an adventure rather than a task. It’s like science fiction slowly turning into science fact! 🌐✨"
    },
    {
        id: 5,
        title: "When Coding Feels Like Magic",
        author: "Priya Das",
        image: avatar5,
        excerpt: "Every student who codes feels the thrill of creation — transforming logical lines into ideas, tools, and digital worlds that inspire others.",
        fullContent: "Today I wrote my first real piece of code that actually worked — an AI chatbot that replied to my questions. At first, it was just random lines of text and logic that made no sense. But when it finally responded correctly, I literally jumped out of my chair! It felt like I made a machine understand me. That moment made me realize how creative coding can be. You’re not just typing commands; you’re building something that can think, calculate, and even communicate. For the first time, I felt what it means to create with logic — and it felt like magic. 💻💫"
    },
    {
        id: 6,
        title: "New Education Policy: Focusing on Real Learning",
        author: "Liam Chen",
        image: avatar6,
        excerpt: "India’s new education system encourages creativity, skill-building, and curiosity — helping students grow beyond marks into confident, capable learners.",
        fullContent: "Recently, I read about the new education policy that’s being introduced in India. It focuses on skill development, creativity, and real-world understanding instead of rote learning and exams. As a student, that really excited me! I’ve always felt that grades don’t fully define what we’re capable of. The new policy encourages us to explore, question, and create rather than memorize and repeat. If schools start implementing it well, students will finally get the freedom to follow their passion — be it art, coding, music, or science — without fear of being judged just by marks. 📚🌟"
    },
    {
        id: 7,
        title: "A Science Fair Surprise!",
        author: "Aisha Chetry",
        image: avatar7,
        excerpt: "Innovation starts small — even a simple banana battery can light up curiosity, creativity, and the spirit of discovery in every student.",
        fullContent: "During our annual school science fair, a junior student built a banana battery that could actually light up a small bulb! 🍌⚡ Everyone was amazed, and I couldn’t stop smiling. It was such a creative way to show how simple chemistry can generate real electricity. What impressed me most wasn’t just the idea, but the confidence with which the student explained it. That project reminded me that innovation doesn’t always need expensive equipment — it starts with curiosity, imagination, and the courage to experiment. Science isn’t just for geniuses; it’s for anyone who’s curious enough to try. 🔬"
    },
    {
        id: 8,
        title: "AI Drawing Tools Are Getting Crazy Good!",
        author: "Eshan Cher",
        image: avatar8,
        excerpt: "AI art generators are teaching us how machines can be creative too — blending imagination, design, and technology like never before.",
        fullContent: "Today, I tried an AI art generator for fun. I just typed “a robot studying under the stars,” and within seconds it created a breathtaking digital painting! The colors, lighting, and composition were so good that it was hard to believe a machine made it. It made me realize how much technology is evolving — not just in logic, but in creativity too. AI tools are helping artists, students, and even teachers visualize ideas that were once hard to imagine. Maybe one day, AI and humans will co-create masterpieces together. 🎨🤖."
    },
    {
        id: 9,
        title: "FStudents and Space: The Next Big Dream",
        author: "Sara Khan",
        image: avatar9,
        excerpt: "From school projects to mini satellites, young innovators worldwide are exploring the universe — proving that space belongs to dreamers too.",
        fullContent: "More and more students around the world are joining space clubs, robotics teams, and even satellite design programs. I recently read about a group of Indian students who helped design a mini satellite that was actually launched into orbit by ISRO! Isn’t that incredible? It shows that age doesn’t matter when it comes to innovation — curiosity does. I’ve started following such stories for motivation, and now I dream of contributing to something big too — maybe not a rocket, but perhaps an idea that reaches space someday. 🚀🌠."
    }
];

// The component name MUST be capitalized (PascalCase)
const Blog = () => {
    const [posts, setPosts] = useState(initialBlogPosts);
    const [userBlogCount, setUserBlogCount] = useState(0);
    const [isPremiumModalVisible, setPremiumModalVisible] = useState(false);
    const [isWriteModalOpen, setWriteModalOpen] = useState(false);
    const [isLoginPromptOpen, setLoginPromptOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const [isDropdownOpen, setDropdownOpen] = useState(false);

    // Form state for adding blog
    const [newBlogTitle, setNewBlogTitle] = useState("");
    const [newBlogExcerpt, setNewBlogExcerpt] = useState("");
    const [newBlogContent, setNewBlogContent] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    const { appState, theme } = useAppContext();
    const { user } = appState;
    const navigate = useNavigate();

    // Load blogs from database and user count
    useEffect(() => {
        let isMounted = true;
        const fetchAllBlogs = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/blogs/all`);
                const data = await res.json();
                if (data.success && Array.isArray(data.blogs) && isMounted) {
                    const dbBlogs = data.blogs.map(b => ({
                        id: b._id,
                        title: b.title,
                        author: b.author,
                        image: b.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.author || "Student")}&background=4f46e5&color=fff&bold=true&size=150`,
                        excerpt: b.excerpt,
                        fullContent: b.fullContent,
                        createdAt: b.createdAt,
                        isUserBlog: true,
                    }));
                    setPosts([...dbBlogs, ...initialBlogPosts]);
                }
            } catch (err) {
                console.error("Error fetching blogs:", err);
            }
        };

        const fetchUserCount = async () => {
            if (!user) return;
            try {
                const res = await fetch(`${API_BASE}/api/blogs/user-count`, {
                    credentials: "include",
                });
                const data = await res.json();
                if (data.success && isMounted) {
                    setUserBlogCount(data.count || 0);
                }
            } catch (err) {
                console.error("Error fetching user blog count:", err);
            }
        };

        fetchAllBlogs();
        fetchUserCount();

        return () => {
            isMounted = false;
        };
    }, [user]);

    const handleAddBlogClick = () => {
        if (!user) {
            setLoginPromptOpen(true);
            return;
        }

        if (userBlogCount >= 5) {
            setPremiumModalVisible(true);
            return;
        }

        setFormError("");
        setNewBlogTitle("");
        setNewBlogExcerpt("");
        setNewBlogContent("");
        setWriteModalOpen(true);
    };

    const handlePublishBlog = async (e) => {
        e.preventDefault();
        if (!newBlogTitle.trim()) {
            setFormError("Please enter a blog title.");
            return;
        }
        if (!newBlogContent.trim()) {
            setFormError("Please write some content for your blog.");
            return;
        }

        setIsSubmitting(true);
        setFormError("");

        try {
            const res = await fetch(`${API_BASE}/api/blogs/create`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    title: newBlogTitle.trim(),
                    excerpt: newBlogExcerpt.trim(),
                    fullContent: newBlogContent.trim(),
                }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                const publishedBlog = {
                    id: data.blog._id,
                    title: data.blog.title,
                    author: data.blog.author,
                    image: data.blog.authorImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.blog.author || "Student")}&background=4f46e5&color=fff&bold=true&size=150`,
                    excerpt: data.blog.excerpt,
                    fullContent: data.blog.fullContent,
                    createdAt: data.blog.createdAt,
                    isUserBlog: true,
                };

                setPosts(prev => [publishedBlog, ...prev]);
                setUserBlogCount(data.count ?? (userBlogCount + 1));
                setWriteModalOpen(false);
                setNewBlogTitle("");
                setNewBlogExcerpt("");
                setNewBlogContent("");
                setSuccessMessage("Blog published successfully! It is now live with other blogs.");
                setTimeout(() => setSuccessMessage(""), 5000);
            } else if (data.limitReached) {
                setWriteModalOpen(false);
                setPremiumModalVisible(true);
            } else {
                setFormError(data.message || "Failed to publish blog.");
            }
        } catch (err) {
            console.error("Error creating blog:", err);
            setFormError("Server error occurred while publishing blog.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/auth/logout`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
            });

            const data = await res.json();

            // Remove user from storage & state regardless of API response
            localStorage.removeItem("user");
            setDropdownOpen(false);

            if (res.ok) {
                navigate("/");
            } else {
                console.error("Logout failed:", data.message);
            }
        } catch (error) {
            console.error("Error during logout:", error);
            // Ensure frontend logout even if server call fails
            localStorage.removeItem("user");
            setDropdownOpen(false);
            alert("An error occurred during logout.");
        }
    };

    return (
        <div className={`blog-page-container min-h-screen relative z-10 transition-colors duration-500 ${theme === 'dark' ? 'dark-theme text-white' : 'light-theme text-slate-800'}`}>
            {/* Unified Navbar with ThemeToggle */}
            <Navbar />

            <main className="container">
                {/* Page Introduction Card */}
                <PageIntroCard className="mb-6" />

                {successMessage && (
                    <div className="blog-success-banner mb-6">
                        <span>✨</span>
                        <span>{successMessage}</span>
                    </div>
                )}

                <div className="add-blog-section">
                    <button onClick={handleAddBlogClick} className="add-blog-btn">
                        ✍️ Add Your Blog
                    </button>
                    {user && (
                        <div className="blog-count-pill">
                            {userBlogCount >= 5 ? "Limit Reached: 5/5 Free Blogs" : `Free Blogs: ${userBlogCount}/5 used`}
                        </div>
                    )}
                </div>

                <div className="blog-grid">
                    {posts.map(post => (
                        <div key={post.id} className="blog-card" onClick={() => setSelectedPost(post)}>
                            <div className="blog-header">
                                <div className="user-avatar">{post.image ? <img src={post.image} alt={post.author} /> : <i className="fa fa-user"></i>}</div>
                                <div className="user-name">{post.author}</div>
                            </div>
                            <div className="blog-content">
                                <h3>{post.title}</h3>
                                <p>{post.excerpt}</p>
                                <div className="read-more-btn">Read More</div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* WRITE BLOG MODAL */}
            {isWriteModalOpen && (
                <div className="blog-write-overlay" onClick={() => setWriteModalOpen(false)}>
                    <div className="blog-write-card" onClick={e => e.stopPropagation()}>
                        <span className="close-write-modal" onClick={() => setWriteModalOpen(false)}>×</span>
                        <div className="write-modal-header">
                            <div className="write-badge">
                                <span className="write-badge-dot"></span>
                                <span>Free Blog {userBlogCount + 1} of 5</span>
                            </div>
                            <h2>Write Your Blog</h2>
                            <p>Share your knowledge, ideas, or study insights with the StudyBuddy community.</p>
                        </div>

                        <form onSubmit={handlePublishBlog} className="write-blog-form">
                            {formError && <div className="write-error-box">{formError}</div>}

                            <div className="form-group">
                                <label>Blog Title <span className="req">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. How Space Technology Inspires Me..."
                                    value={newBlogTitle}
                                    onChange={e => setNewBlogTitle(e.target.value)}
                                    maxLength={140}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>Short Summary / Preview <span className="opt">(Optional)</span></label>
                                <input
                                    type="text"
                                    placeholder="Brief 1-2 sentence preview for the card..."
                                    value={newBlogExcerpt}
                                    onChange={e => setNewBlogExcerpt(e.target.value)}
                                    maxLength={220}
                                />
                            </div>

                            <div className="form-group">
                                <label>Blog Content <span className="req">*</span></label>
                                <textarea
                                    rows={7}
                                    placeholder="Write your full story or thoughts here..."
                                    value={newBlogContent}
                                    onChange={e => setNewBlogContent(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="write-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => setWriteModalOpen(false)}
                                    className="modal-cancel-btn"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="modal-submit-btn"
                                    disabled={isSubmitting || !newBlogTitle.trim() || !newBlogContent.trim()}
                                >
                                    {isSubmitting ? "Publishing..." : "Publish Blog 🚀"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LOGIN REQUIRED MODAL */}
            {isLoginPromptOpen && (
                <div className="blog-write-overlay" onClick={() => setLoginPromptOpen(false)}>
                    <div className="blog-write-card prompt-card" onClick={e => e.stopPropagation()}>
                        <span className="close-write-modal" onClick={() => setLoginPromptOpen(false)}>×</span>
                        <div className="prompt-icon">🔐</div>
                        <h2>Login Required</h2>
                        <p>You need to be logged in to write and publish your blogs. Each student can publish up to 5 free blogs!</p>
                        <div className="button-container mt-6">
                            <button
                                onClick={() => {
                                    setLoginPromptOpen(false);
                                    navigate("/");
                                }}
                                className="modal-submit-btn"
                            >
                                Go to Login
                            </button>
                            <button
                                onClick={() => setLoginPromptOpen(false)}
                                className="modal-cancel-btn"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PREMIUM LIMIT MODAL */}
            {isPremiumModalVisible && (
                <div className="blog-write-overlay" onClick={() => setPremiumModalVisible(false)}>
                    <div className="blog-write-card prompt-card" onClick={e => e.stopPropagation()}>
                        <span className="close-write-modal" onClick={() => setPremiumModalVisible(false)}>×</span>
                        <div className="prompt-icon">💎</div>
                        <h2>Free Blog Limit Reached (5/5)</h2>
                        <p>You have published all 5 of your free blogs! Upgrade to <strong>StudyBuddy Premium</strong> to publish unlimited blogs and reach more students.</p>
                        <div className="button-container mt-6">
                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="buy-btn"
                                style={{ textDecoration: 'none' }}
                            >
                                Buy Premium ✨
                            </a>
                            <button
                                onClick={() => setPremiumModalVisible(false)}
                                className="modal-cancel-btn"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL BLOG READER VIEW */}
            {selectedPost && (
                <div className="blog-full-view" style={{ display: 'flex' }} onClick={() => setSelectedPost(null)}>
                    <div className="blog-full-content" onClick={e => e.stopPropagation()}>
                        <span className="close-full-view" onClick={() => setSelectedPost(null)}>×</span>
                        <div className="full-blog-header">
                            <div className="user-avatar">{selectedPost.image ? <img src={selectedPost.image} alt={selectedPost.author} /> : <i className="fa fa-user"></i>}</div>
                            <div className="user-info">
                                <h2>{selectedPost.title}</h2>
                                <p>by {selectedPost.author}</p>
                            </div>
                        </div>
                        <div className="full-blog-content-text">
                            {selectedPost.fullContent.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* The entire CSS block from your file */
                .blog-page-container {
                    font-family: 'Poppins', sans-serif;
                    background: transparent;
                    color: inherit;
                    line-height: 1.6;
                    overflow-x: hidden;
                    min-height: 100vh;
                }
                :root {
                    --heading-color: #1b3f30;
                    --card-bg: #fbf9f3;
                }

                /* --- LIGHT THEME (Matches VideoTracker Light Mode) --- */
                .light-theme .blog-card {
                    background: #fbf9f3 !important;
                    border: 1px solid #eee8de !important;
                    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.03) !important;
                    border-radius: 24px !important;
                    color: #0f172a !important;
                }
                .light-theme .blog-card:hover {
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08) !important;
                    border-color: #e2dac9 !important;
                }
                .light-theme .blog-full-content {
                    background: #fbf9f3 !important;
                    border: 1px solid #eee8de !important;
                    border-radius: 24px !important;
                    box-shadow: 0 16px 45px rgba(0, 0, 0, 0.1) !important;
                    color: #0f172a !important;
                }
                .light-theme .premium-modal {
                    background: #fbf9f3 !important;
                    border: 1px solid #eee8de !important;
                    border-radius: 24px !important;
                    box-shadow: 0 16px 45px rgba(0, 0, 0, 0.1) !important;
                    color: #0f172a !important;
                }
                .light-theme .premium-modal p {
                    color: #1b3f30 !important;
                }
                .light-theme .premium-modal .close-btn {
                    background: #eee8de !important;
                    color: #334155 !important;
                }
                .light-theme .premium-modal .close-btn:hover {
                    background: #e2dbce !important;
                }
                .light-theme .blog-header .user-name {
                    color: #0f172a !important;
                }
                .light-theme .blog-header .user-avatar {
                    background-color: #f4efe6 !important;
                    border: 1.5px solid #eee8de !important;
                    color: #64748b !important;
                }
                .light-theme .blog-content h3 {
                    color: #1b3f30 !important;
                }
                .light-theme .blog-content p {
                    color: #475569 !important;
                }
                .light-theme .close-full-view {
                    color: #1b3f30 !important;
                }
                .light-theme .full-blog-header h2 {
                    color: #1b3f30 !important;
                }
                .light-theme .full-blog-header p {
                    color: #64748b !important;
                }
                .light-theme .full-blog-content-text {
                    color: #1e293b !important;
                }
                /* Light Mode Buttons: VideoTracker emerald/forest green #1b3f30 */
                .light-theme .add-blog-btn,
                .light-theme .read-more-btn,
                .light-theme .buy-btn {
                    background: #1b3f30 !important;
                    color: #ffffff !important;
                    box-shadow: 0 4px 14px rgba(27, 63, 48, 0.25) !important;
                }
                .light-theme .add-blog-btn:hover,
                .light-theme .read-more-btn:hover,
                .light-theme .buy-btn:hover {
                    background: #143024 !important;
                    box-shadow: 0 6px 20px rgba(27, 63, 48, 0.35) !important;
                    transform: translateY(-2px);
                }

                /* --- DARK THEME (Matches VideoTracker Dark Mode) --- */
                .dark-theme .blog-card {
                    background: #161a20 !important;
                    border: 1px solid rgba(31, 41, 55, 0.9) !important;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35) !important;
                    border-radius: 24px !important;
                    color: #ffffff !important;
                }
                .dark-theme .blog-card:hover {
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5) !important;
                    border-color: rgba(75, 85, 99, 0.7) !important;
                }
                .dark-theme .blog-full-content {
                    background: #161a20 !important;
                    border: 1px solid rgba(31, 41, 55, 0.9) !important;
                    border-radius: 24px !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55) !important;
                    color: #ffffff !important;
                }
                .dark-theme .premium-modal {
                    background: #161a20 !important;
                    border: 1px solid rgba(31, 41, 55, 0.9) !important;
                    border-radius: 24px !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55) !important;
                    color: #ffffff !important;
                }
                .dark-theme .premium-modal p {
                    color: #ffffff !important;
                }
                .dark-theme .premium-modal .close-btn {
                    background: #1e293b !important;
                    color: #cbd5e1 !important;
                }
                .dark-theme .premium-modal .close-btn:hover {
                    background: #334155 !important;
                }
                .dark-theme .blog-header .user-name {
                    color: #f1f5f9 !important;
                }
                .dark-theme .blog-header .user-avatar {
                    background-color: rgba(255, 255, 255, 0.06) !important;
                    border: 1.5px solid rgba(255, 255, 255, 0.12) !important;
                    color: #94a3b8 !important;
                }
                .dark-theme .blog-content h3 {
                    color: #ffffff !important;
                }
                .dark-theme .blog-content p {
                    color: #94a3b8 !important;
                }
                .dark-theme .blog-full-view {
                    background: rgba(0, 0, 0, 0.75) !important;
                }
                .dark-theme .close-full-view {
                    color: #a5b4fc !important;
                }
                .dark-theme .full-blog-header h2 {
                    color: #ffffff !important;
                }
                .dark-theme .full-blog-header p {
                    color: #94a3b8 !important;
                }
                .dark-theme .full-blog-content-text {
                    color: #e2e8f0 !important;
                }
                /* Dark Mode Buttons: VideoTracker indigo #4f46e5 */
                .dark-theme .add-blog-btn,
                .dark-theme .read-more-btn,
                .dark-theme .buy-btn {
                    background: #4f46e5 !important;
                    color: #ffffff !important;
                    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35) !important;
                }
                .dark-theme .add-blog-btn:hover,
                .dark-theme .read-more-btn:hover,
                .dark-theme .buy-btn:hover {
                    background: #4338ca !important;
                    box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45) !important;
                    transform: translateY(-2px);
                }

                .container {
                    max-width: 1200px;
                    margin: 2rem auto;
                    padding: 0 1rem;
                }
                .add-blog-section {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    margin-bottom: 3rem;
                    padding: 1rem 0;
                }
                .add-blog-btn {
                    padding: 0.9rem 2.2rem;
                    font-size: 1.05rem;
                    font-weight: 700;
                    border: none;
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .add-blog-btn:active {
                    transform: scale(0.97);
                }
                .premium-modal {
                    display: none;
                    border-radius: 24px;
                    padding: 1.75rem 2.25rem;
                    position: absolute;
                    top: calc(100% + 1rem);
                    z-index: 10;
                    flex-direction: column;
                    align-items: center;
                }
                .premium-modal.visible {
                    display: flex;
                }
                .premium-modal p {
                    font-size: 1.15rem;
                    font-weight: 700;
                    margin-bottom: 1.25rem;
                }
                .premium-modal .buy-btn {
                    padding: 0.6rem 1.6rem;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.95rem;
                    cursor: pointer;
                    text-decoration: none;
                    transition: all 0.25s ease;
                }
                .premium-modal .close-btn {
                    border: none;
                    padding: 0.6rem 1.6rem;
                    border-radius: 12px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.95rem;
                    transition: all 0.2s ease;
                }
                .premium-modal .button-container {
                    display: flex;
                    gap: 1rem;
                }
                .blog-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 2rem;
                }
                .blog-card {
                    padding: 1.5rem 1.6rem;
                    border-radius: 24px;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
                }
                .blog-card:hover {
                    transform: translateY(-4px);
                }
                .blog-header {
                    display: flex;
                    align-items: center;
                    margin-bottom: 1rem;
                    gap: 1.1rem;
                }
                .blog-header .user-avatar {
                    width: 70px;
                    height: 70px;
                    border-radius: 50%;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 1.6rem;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .blog-header .user-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .blog-header .user-name {
                    font-weight: 700;
                    font-size: 1.12rem;
                }
                .blog-content {
                    display: flex;
                    flex-direction: column;
                    flex-grow: 1;
                }
                .blog-content h3 {
                    margin-bottom: 0.6rem;
                    font-size: 1.2rem;
                    font-weight: 700;
                    line-height: 1.35;
                }
                .blog-content p {
                    font-size: 0.92rem;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    -webkit-line-clamp: 3;
                    flex-grow: 1;
                }
                .read-more-btn {
                    padding: 0.55rem 1.4rem;
                    border: none;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 0.88rem;
                    cursor: pointer;
                    text-decoration: none;
                    display: inline-block;
                    margin-top: auto;
                    align-self: flex-start;
                    transition: all 0.25s ease;
                }
                .read-more-btn:active {
                    transform: scale(0.96);
                }
                .blog-full-view {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: none;
                    justify-content: center;
                    align-items: center;
                    z-index: 100;
                    padding: 1.5rem;
                    overflow-y: auto;
                }
                .blog-full-content {
                    padding: 2.5rem 3rem;
                    border-radius: 24px;
                    max-width: 800px;
                    width: 100%;
                    position: relative;
                    animation: fadein 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                }
                @keyframes fadein {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
                .close-full-view {
                    position: absolute;
                    top: 1.25rem;
                    right: 1.5rem;
                    font-size: 2.2rem;
                    line-height: 1;
                    cursor: pointer;
                    transition: transform 0.2s ease, opacity 0.2s ease;
                    opacity: 0.7;
                }
                .close-full-view:hover {
                    opacity: 1;
                    transform: scale(1.1);
                }
                .full-blog-header {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    margin-bottom: 2rem;
                }
                .full-blog-header .user-avatar {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    overflow: hidden;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
                }
                .full-blog-header .user-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .full-blog-header h2 {
                    font-size: 1.8rem;
                    font-weight: 800;
                    line-height: 1.25;
                }
                .full-blog-header p {
                    font-style: italic;
                    margin-top: 0.25rem;
                }
                .full-blog-content-text {
                    line-height: 1.8;
                    font-size: 1.05rem;
                }
                .full-blog-content-text p {
                    margin-bottom: 1.2rem;
                }

                /* --- WRITE BLOG & PROMPT MODALS STYLES --- */
                .blog-write-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 200;
                    padding: 1.25rem;
                    overflow-y: auto;
                }
                .blog-write-card {
                    width: 100%;
                    max-width: 680px;
                    border-radius: 24px;
                    padding: 2.25rem;
                    position: relative;
                    animation: fadein 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    margin: auto;
                }
                .light-theme .blog-write-card {
                    background: #fbf9f3 !important;
                    border: 1px solid #eee8de !important;
                    box-shadow: 0 16px 45px rgba(0, 0, 0, 0.12) !important;
                    color: #0f172a !important;
                }
                .dark-theme .blog-write-card {
                    background: #161a20 !important;
                    border: 1px solid rgba(31, 41, 55, 0.9) !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6) !important;
                    color: #ffffff !important;
                }
                .close-write-modal {
                    position: absolute;
                    top: 1.25rem;
                    right: 1.5rem;
                    font-size: 2.2rem;
                    line-height: 1;
                    cursor: pointer;
                    opacity: 0.65;
                    transition: transform 0.2s ease, opacity 0.2s ease;
                }
                .close-write-modal:hover {
                    opacity: 1;
                    transform: scale(1.1);
                }
                .write-modal-header {
                    margin-bottom: 1.75rem;
                }
                .write-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.35rem 0.85rem;
                    border-radius: 9999px;
                    font-size: 0.82rem;
                    font-weight: 700;
                    margin-bottom: 0.75rem;
                }
                .light-theme .write-badge {
                    background: #eaf3ee;
                    color: #1b3f30;
                    border: 1px solid rgba(27, 63, 48, 0.2);
                }
                .dark-theme .write-badge {
                    background: rgba(79, 70, 229, 0.18);
                    color: #a5b4fc;
                    border: 1px solid rgba(99, 102, 241, 0.3);
                }
                .write-badge-dot {
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                }
                .light-theme .write-badge-dot {
                    background: #1b3f30;
                }
                .dark-theme .write-badge-dot {
                    background: #818cf8;
                }
                .write-modal-header h2 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    line-height: 1.2;
                    margin-bottom: 0.4rem;
                }
                .light-theme .write-modal-header h2 {
                    color: #1b3f30;
                }
                .dark-theme .write-modal-header h2 {
                    color: #ffffff;
                }
                .write-modal-header p {
                    font-size: 0.95rem;
                    opacity: 0.8;
                }
                .write-blog-form .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    margin-bottom: 1.25rem;
                }
                .write-blog-form label {
                    font-weight: 700;
                    font-size: 0.92rem;
                }
                .write-blog-form .req {
                    color: #ef4444;
                }
                .write-blog-form .opt {
                    font-size: 0.8rem;
                    opacity: 0.65;
                    font-weight: 500;
                }
                .write-blog-form input,
                .write-blog-form textarea {
                    width: 100%;
                    padding: 0.85rem 1.15rem;
                    border-radius: 14px;
                    font-size: 0.95rem;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .light-theme .write-blog-form input,
                .light-theme .write-blog-form textarea {
                    background: #ffffff;
                    border: 1.5px solid #eee8de;
                    color: #0f172a;
                }
                .light-theme .write-blog-form input:focus,
                .light-theme .write-blog-form textarea:focus {
                    border-color: #1b3f30;
                    box-shadow: 0 0 0 3px rgba(27, 63, 48, 0.15);
                }
                .dark-theme .write-blog-form input,
                .dark-theme .write-blog-form textarea {
                    background: #0d1015;
                    border: 1.5px solid rgba(255, 255, 255, 0.12);
                    color: #ffffff;
                }
                .dark-theme .write-blog-form input:focus,
                .dark-theme .write-blog-form textarea:focus {
                    border-color: #6366f1;
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
                }
                .write-error-box {
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.4);
                    color: #ef4444;
                    padding: 0.75rem 1rem;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 1.25rem;
                }
                .write-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 1.75rem;
                }
                .modal-submit-btn {
                    padding: 0.75rem 1.8rem;
                    font-size: 0.98rem;
                    font-weight: 700;
                    border: none;
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.25s ease;
                }
                .light-theme .modal-submit-btn {
                    background: #1b3f30 !important;
                    color: #ffffff !important;
                    box-shadow: 0 4px 14px rgba(27, 63, 48, 0.25) !important;
                }
                .light-theme .modal-submit-btn:hover:not(:disabled) {
                    background: #143024 !important;
                    transform: translateY(-2px);
                }
                .dark-theme .modal-submit-btn {
                    background: #4f46e5 !important;
                    color: #ffffff !important;
                    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35) !important;
                }
                .dark-theme .modal-submit-btn:hover:not(:disabled) {
                    background: #4338ca !important;
                    transform: translateY(-2px);
                }
                .modal-submit-btn:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .modal-cancel-btn {
                    padding: 0.75rem 1.6rem;
                    font-size: 0.95rem;
                    font-weight: 600;
                    border: none;
                    border-radius: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .light-theme .modal-cancel-btn {
                    background: #eee8de;
                    color: #334155;
                }
                .light-theme .modal-cancel-btn:hover {
                    background: #e2dbce;
                }
                .dark-theme .modal-cancel-btn {
                    background: #1e293b;
                    color: #cbd5e1;
                }
                .dark-theme .modal-cancel-btn:hover {
                    background: #334155;
                }
                .blog-count-pill {
                    margin-left: 1rem;
                    font-size: 0.88rem;
                    font-weight: 700;
                    padding: 0.4rem 1rem;
                    border-radius: 9999px;
                    display: inline-flex;
                    align-items: center;
                }
                .light-theme .blog-count-pill {
                    background: #eaf3ee;
                    color: #1b3f30;
                    border: 1px solid rgba(27, 63, 48, 0.2);
                }
                .dark-theme .blog-count-pill {
                    background: rgba(79, 70, 229, 0.16);
                    color: #a5b4fc;
                    border: 1px solid rgba(99, 102, 241, 0.3);
                }
                .blog-success-banner {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem 1.5rem;
                    border-radius: 16px;
                    font-weight: 700;
                    font-size: 1rem;
                    animation: fadein 0.3s ease;
                }
                .light-theme .blog-success-banner {
                    background: #e8f5e9;
                    color: #1b5e20;
                    border: 1px solid #c8e6c9;
                }
                .dark-theme .blog-success-banner {
                    background: rgba(16, 185, 129, 0.16);
                    color: #34d399;
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .prompt-card {
                    max-width: 520px;
                    text-align: center;
                    padding: 2.5rem 2rem;
                }
                .prompt-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                .prompt-card h2 {
                    font-size: 1.6rem;
                    font-weight: 800;
                    margin-bottom: 0.6rem;
                }
                .prompt-card p {
                    font-size: 1rem;
                    line-height: 1.6;
                    opacity: 0.85;
                }
                .prompt-card .button-container {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                    margin-top: 1.75rem;
                }
            `}</style>
        </div>
    );
};

// The export must be a default export to match your other files
export default Blog;