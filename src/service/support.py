# service/support.py
from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from pymongo import MongoClient, DESCENDING
from bson import ObjectId
import os
import datetime
import certifi
import uuid
from typing import Dict, List, Optional

# ✅ CRITICAL: Import and load environment variables at the top
from dotenv import load_dotenv
load_dotenv()

support_bp = Blueprint("support_bp", __name__)

# Configuration - Now properly loaded from .env
MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB = os.getenv("MONGO_DB")

# Validate configuration
if not MONGO_URI or not MONGO_DB:
    raise RuntimeError("MONGO_URI and MONGO_DB must be set in .env file")

UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads", "community")
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'zip'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# Create upload directory
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"✓ Community uploads folder: {UPLOAD_FOLDER}")

# MongoDB connection
try:
    client = MongoClient(MONGO_URI, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
    # Test connection
    client.server_info()
    db = client[MONGO_DB]
    posts_collection = db["community_posts"]
    users_collection = db["users"]
    print(f"✓ Community service connected to MongoDB: {MONGO_DB}")
except Exception as e:
    print(f"✗ Failed to connect to MongoDB: {e}")
    raise

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_profile(email: str) -> Dict:
    """Get user profile information by email"""
    try:
        user = users_collection.find_one({"email": email})
        if user:
            return {
                "email": email,
                "username": user.get("name", email.split('@')[0]),
                "full_name": user.get("name", ""),
                "avatar": user.get("avatar", ""),
                "role": user.get("userType", "user")
            }
        # Return default profile if user not found
        return {
            "email": email,
            "username": email.split('@')[0],
            "full_name": "",
            "avatar": "",
            "role": "user"
        }
    except Exception as e:
        print(f"Error getting user profile for {email}: {e}")
        return {
            "email": email,
            "username": email.split('@')[0],
            "full_name": "",
            "avatar": "",
            "role": "user"
        }

def format_post(post: Dict) -> Dict:
    """Format post for JSON response"""
    try:
        post["_id"] = str(post["_id"])
        
        # Format author information
        if "author" in post:
            author_info = get_user_profile(post["author"])
            post["author_info"] = author_info
            # For backwards compatibility, keep author as username
            post["author"] = author_info["username"]
        
        # Format comments
        if "comments" in post:
            formatted_comments = []
            for comment in post["comments"]:
                comment_dict = dict(comment)
                if "user" in comment_dict:
                    comment_dict["user_info"] = get_user_profile(comment_dict["user"])
                    comment_dict["user"] = comment_dict["user_info"]["username"]
                # Ensure createdAt field exists
                if "createdAt" not in comment_dict and "time" in comment_dict:
                    comment_dict["createdAt"] = comment_dict["time"]
                formatted_comments.append(comment_dict)
            post["comments"] = formatted_comments
        
        # Ensure createdAt field exists
        if "createdAt" not in post and "time" in post:
            post["createdAt"] = post["time"]
        
        return post
    except Exception as e:
        print(f"Error formatting post: {e}")
        return post

# 🟢 Create new post
@support_bp.route("/api/community/post", methods=["POST"])
@jwt_required()
def create_post():
    try:
        current_user = get_jwt_identity()
        print(f"\n=== CREATE POST ===")
        print(f"User: {current_user}")
        
        title = request.form.get("title", "").strip()
        content = request.form.get("content", "").strip()
        tags = request.form.get("tags", "")
        file = request.files.get("file")

        print(f"Title: {title[:50]}...")
        print(f"Content length: {len(content)}")
        print(f"File: {file.filename if file else 'None'}")

        # Validation
        if not title:
            return jsonify({"success": False, "error": "Post title is required"}), 400
        if not content:
            return jsonify({"success": False, "error": "Post content is required"}), 400
        if len(title) > 100:
            return jsonify({"success": False, "error": "Title must be less than 100 characters"}), 400
        if len(content) > 5000:
            return jsonify({"success": False, "error": "Content must be less than 5000 characters"}), 400

        file_url = None
        filename = None
        
        # Handle file upload
        if file and file.filename:
            if not allowed_file(file.filename):
                return jsonify({"success": False, "error": f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400
            
            # Check file size
            file.seek(0, os.SEEK_END)
            file_length = file.tell()
            file.seek(0)
            
            if file_length > MAX_FILE_SIZE:
                return jsonify({"success": False, "error": f"File size too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"}), 400

            # Generate unique filename
            file_ext = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
            filename = secure_filename(unique_filename)
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(file_path)
            file_url = f"/api/community/uploads/{filename}"
            print(f"File saved: {filename}")

        # Process tags
        tag_list = [tag.strip() for tag in tags.split(',')] if tags else []
        tag_list = [tag for tag in tag_list if tag and len(tag) <= 20][:5]  # Limit to 5 tags

        # Create post document
        post = {
            "title": title,
            "content": content,
            "author": current_user,  # Store email
            "fileUrl": file_url,
            "filename": filename,
            "tags": tag_list,
            "comments": [],
            "likes": [],
            "likes_count": 0,
            "views": 0,
            "is_pinned": False,
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow()
        }

        # Insert into database
        result = posts_collection.insert_one(post)
        post["_id"] = str(result.inserted_id)
        
        # Format response
        formatted_post = format_post(post)

        print(f"✓ Post created with ID: {formatted_post['_id']}")
        
        return jsonify({
            "success": True, 
            "message": "Post created successfully",
            "post": formatted_post
        }), 201

    except Exception as e:
        print(f"✗ Error in create_post: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Internal server error"}), 500

# 🟡 Get all posts with pagination and filtering
@support_bp.route("/api/community/posts", methods=["GET"])
@jwt_required()
def get_posts():
    try:
        current_user = get_jwt_identity()
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        tag = request.args.get('tag')
        author = request.args.get('author')
        search = request.args.get('search')
        
        print(f"\n=== GET POSTS ===")
        print(f"User: {current_user}, Page: {page}, Limit: {limit}")
        
        # Validate pagination parameters
        if page < 1:
            page = 1
        if limit < 1 or limit > 50:
            limit = 20
        
        skip = (page - 1) * limit
        
        # Build query
        query = {}
        if tag:
            query["tags"] = tag
        if author:
            query["author"] = author
        if search:
            query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"content": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count for pagination
        total_posts = posts_collection.count_documents(query)
        
        # Get posts with sorting (pinned first, then by creation date)
        posts_cursor = posts_collection.find(query).sort([
            ("is_pinned", DESCENDING),
            ("createdAt", DESCENDING)
        ]).skip(skip).limit(limit)
        
        posts = list(posts_cursor)
        
        # Format posts
        formatted_posts = [format_post(post) for post in posts]
        
        # Check if user liked each post
        for post in formatted_posts:
            post["liked"] = current_user in post.get("likes", [])
        
        print(f"✓ Returning {len(formatted_posts)} posts")
        
        return jsonify({
            "success": True,
            "posts": formatted_posts,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_posts,
                "pages": (total_posts + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        print(f"✗ Error in get_posts: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Failed to fetch posts"}), 500

# 🔵 Add comment
@support_bp.route("/api/community/comment/<post_id>", methods=["POST"])
@jwt_required()
def add_comment(post_id):
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
            
        text = data.get("text", "").strip()

        if not text:
            return jsonify({"success": False, "error": "Comment text is required"}), 400
        
        if len(text) > 1000:
            return jsonify({"success": False, "error": "Comment must be less than 1000 characters"}), 400

        # Check if post exists
        post = posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            return jsonify({"success": False, "error": "Post not found"}), 404

        comment = {
            "user": current_user,  # Store email
            "text": text,
            "createdAt": datetime.datetime.utcnow(),
            "updatedAt": datetime.datetime.utcnow()
        }

        # Add comment to post
        result = posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {
                "$push": {"comments": comment},
                "$set": {"updatedAt": datetime.datetime.utcnow()}
            }
        )

        if result.modified_count == 0:
            return jsonify({"success": False, "error": "Failed to add comment"}), 500

        # Get updated comments
        updated_post = posts_collection.find_one({"_id": ObjectId(post_id)})
        formatted_comments = []
        for comment in updated_post.get("comments", []):
            comment_dict = dict(comment)
            comment_dict["user_info"] = get_user_profile(comment_dict["user"])
            comment_dict["user"] = comment_dict["user_info"]["username"]
            formatted_comments.append(comment_dict)

        return jsonify({
            "success": True, 
            "message": "Comment added successfully",
            "comments": formatted_comments
        }), 200

    except Exception as e:
        print(f"✗ Error in add_comment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Failed to add comment"}), 500

# 🔴 Like/Unlike post
@support_bp.route("/api/community/like/<post_id>", methods=["POST"])
@jwt_required()
def like_post(post_id):
    try:
        current_user = get_jwt_identity()

        # Check if post exists
        post = posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            return jsonify({"success": False, "error": "Post not found"}), 404

        # Check if user already liked the post
        user_liked = current_user in post.get("likes", [])
        
        if user_liked:
            # Unlike the post
            result = posts_collection.update_one(
                {"_id": ObjectId(post_id)},
                {
                    "$pull": {"likes": current_user},
                    "$inc": {"likes_count": -1},
                    "$set": {"updatedAt": datetime.datetime.utcnow()}
                }
            )
            message = "Post unliked"
            liked = False
        else:
            # Like the post
            result = posts_collection.update_one(
                {"_id": ObjectId(post_id)},
                {
                    "$addToSet": {"likes": current_user},
                    "$inc": {"likes_count": 1},
                    "$set": {"updatedAt": datetime.datetime.utcnow()}
                }
            )
            message = "Post liked"
            liked = True

        if result.modified_count == 0:
            return jsonify({"success": False, "error": "Failed to update like"}), 500

        # Get updated like count
        updated_post = posts_collection.find_one({"_id": ObjectId(post_id)})
        
        return jsonify({
            "success": True,
            "message": message,
            "likes": updated_post.get("likes_count", 0),
            "liked": liked
        }), 200

    except Exception as e:
        print(f"✗ Error in like_post: {str(e)}")
        return jsonify({"success": False, "error": "Failed to update like"}), 500

# 🟣 Get single post with views tracking
@support_bp.route("/api/community/post/<post_id>", methods=["GET"])
@jwt_required()
def get_single_post(post_id):
    try:
        current_user = get_jwt_identity()

        # Increment view count
        posts_collection.update_one(
            {"_id": ObjectId(post_id)},
            {"$inc": {"views": 1}}
        )

        post = posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            return jsonify({"success": False, "error": "Post not found"}), 404

        formatted_post = format_post(post)
        formatted_post["liked"] = current_user in post.get("likes", [])

        return jsonify({
            "success": True,
            "post": formatted_post
        }), 200

    except Exception as e:
        print(f"✗ Error in get_single_post: {str(e)}")
        return jsonify({"success": False, "error": "Failed to fetch post"}), 500

# 🟠 Serve uploaded files
@support_bp.route("/api/community/uploads/<filename>")
@jwt_required()
def serve_file(filename):
    try:
        # Security check - ensure filename is safe
        safe_filename = secure_filename(filename)
        if not safe_filename or safe_filename != filename:
            return jsonify({"success": False, "error": "Invalid filename"}), 400
        
        return send_from_directory(UPLOAD_FOLDER, filename)
    except Exception as e:
        print(f"✗ Error serving file: {str(e)}")
        return jsonify({"success": False, "error": "File not found"}), 404

# 🟡 Get popular tags
@support_bp.route("/api/community/tags", methods=["GET"])
@jwt_required()
def get_popular_tags():
    try:
        # Aggregate to get most used tags
        pipeline = [
            {"$unwind": "$tags"},
            {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 20}
        ]
        
        popular_tags = list(posts_collection.aggregate(pipeline))
        
        tags = [{"name": tag["_id"], "count": tag["count"]} for tag in popular_tags]
        
        return jsonify({
            "success": True,
            "tags": tags
        }), 200
        
    except Exception as e:
        print(f"✗ Error in get_popular_tags: {str(e)}")
        return jsonify({"success": False, "error": "Failed to fetch tags"}), 500

# 🟤 Delete post (author only)
@support_bp.route("/api/community/post/<post_id>", methods=["DELETE"])
@jwt_required()
def delete_post(post_id):
    try:
        current_user = get_jwt_identity()

        post = posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            return jsonify({"success": False, "error": "Post not found"}), 404

        # Check if user is the author
        if post.get("author") != current_user:
            return jsonify({"success": False, "error": "Unauthorized to delete this post"}), 403

        # Delete associated file if exists
        if post.get("filename"):
            try:
                file_path = os.path.join(UPLOAD_FOLDER, post["filename"])
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as file_error:
                print(f"Error deleting file: {file_error}")

        # Delete post from database
        result = posts_collection.delete_one({"_id": ObjectId(post_id)})

        if result.deleted_count == 1:
            return jsonify({
                "success": True,
                "message": "Post deleted successfully"
            }), 200
        else:
            return jsonify({"success": False, "error": "Failed to delete post"}), 500

    except Exception as e:
        print(f"✗ Error in delete_post: {str(e)}")
        return jsonify({"success": False, "error": "Failed to delete post"}), 500

# Health check
@support_bp.route("/api/community/health", methods=["GET"])
def health_check():
    try:
        # Test database connection
        posts_collection.find_one()
        return jsonify({
            "success": True,
            "message": "Community service is healthy",
            "timestamp": datetime.datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "Service unavailable",
            "details": str(e)
        }), 503