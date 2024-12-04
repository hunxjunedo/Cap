"use client";

import { useState, useRef, useEffect } from "react";
import { comments as commentsSchema } from "@cap/database/schema";
import { userSelectProps } from "@cap/database/auth/session";
import { Tooltip } from "react-tooltip";
import { AnimatePresence, motion } from "framer-motion";
import { AuthOverlay } from "../AuthOverlay";
import { CapCardAnalytics } from "@/app/dashboard/caps/components/CapCardAnalytics";

type CommentType = typeof commentsSchema.$inferSelect & {
  authorName?: string | null;
};

interface ActivityProps {
  analytics: {
    views: number;
    comments: number;
    reactions: number;
  };
  comments: CommentType[];
  user: typeof userSelectProps | null;
  onSeek?: (time: number) => void;
  videoId: string;
  isOwnerOrMember?: boolean;
}

export const Avatar: React.FC<{
  name: string | null | undefined;
  className?: string;
}> = ({ name, className = "" }) => {
  const initial = name?.[0]?.toUpperCase() || "A";
  const bgColor = name ? "bg-blue-400" : "bg-gray-200";
  const textColor = name ? "text-white" : "text-gray-500";

  return (
    <div
      className={`w-[20px] h-[20px] rounded-full flex items-center justify-center ${bgColor} ${className}`}
    >
      <span className={`text-xs font-medium ${textColor}`}>{initial}</span>
    </div>
  );
};

interface CommentInputProps {
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  showCancelButton?: boolean;
  buttonLabel?: string;
  user?: typeof userSelectProps | null;
  autoFocus?: boolean;
}

const CommentInput: React.FC<CommentInputProps> = ({
  onSubmit,
  onCancel,
  placeholder,
  showCancelButton = false,
  buttonLabel = "Reply",
  user,
  autoFocus = false,
}) => {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (content.trim()) {
      onSubmit(content);
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-start space-x-3">
      <div className="flex-1">
        <div className="bg-gray-100 rounded-lg p-4">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || "Leave a comment"}
            className="w-full text-[15px] leading-[22px] text-gray-500 bg-transparent focus:outline-none"
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={() => handleSubmit()}
              className="px-2 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 focus:outline-none"
            >
              {buttonLabel}
            </button>
            {showCancelButton && onCancel && (
              <button
                onClick={onCancel}
                className="px-2 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-full hover:bg-gray-200 focus:outline-none"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTimestamp = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
};

const Comment: React.FC<{
  comment: CommentType;
  replies: CommentType[];
  onReply: (commentId: string) => void;
  replyingToId: string | null;
  handleReply: (content: string) => void;
  onCancelReply: () => void;
  onDelete: (commentId: string) => void;
  user: typeof userSelectProps | null;
  level?: number;
  onSeek?: (time: number) => void;
}> = ({
  comment,
  replies,
  onReply,
  replyingToId,
  handleReply,
  onCancelReply,
  onDelete,
  user,
  level = 0,
  onSeek,
}) => {
  const isReplying = replyingToId === comment.id;
  const isOwnComment = user?.id === comment.authorId;
  const nestedReplies =
    level === 0
      ? replies.filter((reply) => {
          if (reply.parentCommentId === comment.id) return true;
          const parentComment = replies.find(
            (r) => r.id === reply.parentCommentId
          );
          return parentComment && parentComment.parentCommentId === comment.id;
        })
      : [];

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this comment?")) {
      onDelete(comment.id);
    }
  };

  const canReply = true;
  const commentDate = new Date(comment.createdAt);

  return (
    <motion.div
      id={`comment-${comment.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className={`space-y-3 ${
        level > 0 ? "ml-8 border-l-2 border-gray-100 pl-4" : ""
      }`}
    >
      <div className="flex items-start space-x-3">
        <Avatar name={comment.authorName} />
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">
              {comment.authorName || "Anonymous"}
            </span>
            <span
              className="text-sm text-gray-500"
              data-tooltip-id={`comment-${comment.id}-timestamp`}
              data-tooltip-content={formatTimestamp(commentDate)}
            >
              {formatTimeAgo(commentDate)}
            </span>
            <Tooltip id={`comment-${comment.id}-timestamp`} />
            {comment.timestamp && (
              <button
                onClick={() => onSeek?.(comment.timestamp!)}
                className="text-sm text-blue-500 hover:text-blue-700 cursor-pointer"
              >
                {new Date(comment.timestamp * 1000).toISOString().substr(11, 8)}
              </button>
            )}
          </div>
          <p className="text-gray-700 mt-1">{comment.content}</p>
          <div className="flex items-center space-x-4 mt-2">
            {user && !isReplying && canReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Reply
              </button>
            )}
            {isOwnComment && (
              <button
                onClick={handleDelete}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {isReplying && canReply && (
        <div className="ml-5">
          <CommentInput
            onSubmit={handleReply}
            onCancel={onCancelReply}
            placeholder="Write a reply..."
            showCancelButton={true}
            user={user}
            autoFocus={true}
          />
        </div>
      )}

      {nestedReplies.length > 0 && (
        <div className="space-y-3 mt-3">
          {nestedReplies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              replies={replies}
              onReply={onReply}
              replyingToId={replyingToId}
              handleReply={handleReply}
              onCancelReply={onCancelReply}
              onDelete={onDelete}
              user={user}
              level={1}
              onSeek={onSeek}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export const Activity: React.FC<ActivityProps> = ({
  analytics: initialAnalytics,
  comments: initialComments,
  user,
  onSeek,
  videoId,
  isOwnerOrMember = false,
}) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [comments, setComments] = useState(initialComments);
  const [optimisticComments, setOptimisticComments] = useState<CommentType[]>(
    []
  );
  const [showAuthOverlay, setShowAuthOverlay] = useState(false);
  const [analytics, setAnalytics] = useState(initialAnalytics);
  const commentsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`/api/video/analytics?videoId=${videoId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }
        const analyticsData = await response.json();

        setAnalytics({
          views:
            analyticsData.count === 0 ? comments.length : analyticsData.count,
          comments: comments.length,
          reactions:
            (analyticsData.metadata as { reactions?: number })?.reactions || 0,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    fetchAnalytics();
  }, [videoId, comments.length]);

  useEffect(() => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop =
        commentsContainerRef.current.scrollHeight;
    }
  }, []);

  const scrollToBottom = () => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTo({
        top: commentsContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const addOptimisticComment = (newComment: CommentType) => {
    setOptimisticComments((prev) => [...prev, newComment]);
    setTimeout(scrollToBottom, 100);
  };

  const handleNewComment = async (content: string) => {
    const optimisticComment: CommentType = {
      id: `temp-${Date.now()}`,
      authorId: user?.id || "anonymous",
      authorName: user?.name || "Anonymous",
      content,
      createdAt: new Date(),
      videoId: comments[0]?.videoId || "",
      parentCommentId: "",
      type: "text",
      timestamp: null,
      updatedAt: new Date(),
    };

    addOptimisticComment(optimisticComment);

    try {
      const response = await fetch("/api/video/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "text",
          content,
          videoId: comments[0]?.videoId,
          parentCommentId: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment");
      }

      const newComment = await response.json();

      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id)
      );

      setTimeout(() => {
        setComments((prev) => [
          ...prev,
          { ...optimisticComment, ...newComment },
        ]);
      }, 100);
    } catch (error) {
      console.error("Error posting comment:", error);
      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id)
      );
    }
  };

  const handleReply = async (content: string) => {
    if (!replyingTo) return;

    const parentComment = comments.find((c) => c.id === replyingTo);
    const actualParentId = parentComment?.parentCommentId
      ? parentComment.parentCommentId
      : replyingTo;

    const optimisticReply: CommentType = {
      id: `temp-${Date.now()}`,
      authorId: user?.id || "anonymous",
      authorName: user?.name || "Anonymous",
      content,
      createdAt: new Date(),
      videoId: comments[0]?.videoId || "",
      parentCommentId: actualParentId,
      type: "text",
      timestamp: null,
      updatedAt: new Date(),
    };

    addOptimisticComment(optimisticReply);

    try {
      const response = await fetch("/api/video/comment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "text",
          content,
          videoId: comments[0]?.videoId,
          parentCommentId: actualParentId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post reply");
      }

      const newReply = await response.json();

      // Remove optimistic reply first
      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticReply.id)
      );

      // Add the real reply with a delay and scroll to it
      setTimeout(() => {
        const newReplyWithId = { ...optimisticReply, ...newReply };
        setComments((prev) => [...prev, newReplyWithId]);

        // Wait a bit for the DOM to update, then scroll to the new reply
        setTimeout(() => {
          const newReplyElement = document.getElementById(
            `comment-${newReplyWithId.id}`
          );
          if (newReplyElement) {
            newReplyElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        }, 100);
      }, 100);

      setReplyingTo(null);
    } catch (error) {
      console.error("Error posting reply:", error);
      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticReply.id)
      );
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(
        `/api/video/comment/delete?commentId=${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete comment");
      }

      // Remove the comment and its replies from the state
      setComments((prev) =>
        prev.filter(
          (comment) =>
            comment.id !== commentId && comment.parentCommentId !== commentId
        )
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
      // You might want to show an error toast here
    }
  };

  const allComments = [...comments, ...optimisticComments];
  const rootComments = allComments.filter(
    (comment) => !comment.parentCommentId || comment.parentCommentId === ""
  );

  return (
    <div className="flex flex-col h-full">
      {user && isOwnerOrMember && (
        <div className="flex-none border-b border-gray-200">
          <div className="flex justify-between p-4">
            <CapCardAnalytics
              capId={videoId}
              displayCount={analytics.views}
              totalComments={analytics.comments}
              totalReactions={analytics.reactions}
            />
          </div>
        </div>
      )}

      <div
        ref={commentsContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
      >
        <div className="space-y-6 p-4">
          <AnimatePresence mode="sync">
            {rootComments
              .sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              )
              .map((comment) => (
                <Comment
                  key={comment.id}
                  comment={comment}
                  replies={allComments}
                  onReply={(id) => {
                    if (!user) {
                      setShowAuthOverlay(true);
                    } else {
                      setReplyingTo(id);
                    }
                  }}
                  replyingToId={replyingTo}
                  handleReply={handleReply}
                  onCancelReply={handleCancelReply}
                  onDelete={handleDeleteComment}
                  user={user}
                  onSeek={onSeek}
                />
              ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex-none border-t border-gray-200 bg-white p-4">
        {user ? (
          <CommentInput
            onSubmit={handleNewComment}
            placeholder="Leave a comment"
            buttonLabel="Comment"
            user={user}
          />
        ) : (
          <div
            onClick={() => setShowAuthOverlay(true)}
            className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <span className="text-[15px] leading-[22px] text-gray-500">
              Sign in to leave a comment
            </span>
          </div>
        )}
      </div>

      <AuthOverlay
        isOpen={showAuthOverlay}
        onClose={() => setShowAuthOverlay(false)}
      />
    </div>
  );
};
