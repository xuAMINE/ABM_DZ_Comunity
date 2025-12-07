// app/member/posts/homepage.tsx
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Alert } from "react-native";
import { useEffect, useMemo, useState, useCallback } from "react";
import { deletePost, updatePost } from "@/lib/posts";
import { isPostLikedByMe, toggleLike } from "@/lib/posts";
import {addComment,getCommentsPaginated,} from "@/lib/posts";
import { onSnapshot, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TopBar } from "@/components/TopBar";
import { reportPost } from "@/lib/posts";




import DateTimePicker from "@react-native-community/datetimepicker";

import {
  Platform,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  Modal,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getPublicFeed } from "@/lib/posts";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";

// Dummy implementation for getLikeCount (replace with real implementation)
async function getLikeCount(postId: string): Promise<number> {
  // TODO: Replace with actual logic to fetch like count from your backend or database
  return 0;
}

const CATS = ["janazah", "events", "jobs", "pub"] as const;
type Cat = (typeof CATS)[number];

function timeAgo(ts?: any) {
  try {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return "";
    const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const dd = Math.floor(h / 24);
    return `${dd}d`;
  } catch {
    return "";
  }
}

function Pill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "muted" | "success" | "warning" | "danger";
}) {
  const { theme, isDark } = useAppTheme();
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
    default: { bg: theme.card, fg: theme.text, border: theme.border },
    muted: {
      bg: isDark ? "#111827" : "#f3f4f6",
      fg: isDark ? "#cbd5e1" : "#475569",
      border: theme.border,
    },
    success: {
      bg: isDark ? "#064e3b" : "#ecfdf5",
      fg: isDark ? "#a7f3d0" : "#065f46",
      border: isDark ? "#065f46" : "#a7f3d0",
    },
    warning: {
      bg: isDark ? "#78350f" : "#fffbeb",
      fg: isDark ? "#fde68a" : "#92400e",
      border: isDark ? "#92400e" : "#fcd34d",
    },
    danger: {
      bg: isDark ? "#7f1d1d" : "#fef2f2",
      fg: isDark ? "#fecaca" : "#991b1b",
      border: isDark ? "#ef4444" : "#fecaca",
    },
  };
  const c = palette[tone] ?? palette.default;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bg,
      }}
    >
      <Text style={{ color: c.fg, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function statusTone(s?: string): "muted" | "success" | "warning" | "danger" | "default" {
  switch (s) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "muted";
  }
}

export function PostCard({ item, onEdit, onDelete }: any) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  const MAX_CHARS = 100;
  const isOwner = auth.currentUser?.uid === item.ownerId;
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const shortDescription =
    item.description && item.description.length > MAX_CHARS
      ? item.description.slice(0, MAX_CHARS) + "..."
      : item.description;

  const detailsEntries = item.details ? Object.entries(item.details) : [];



  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);


//////////////////////////////////////////////////////////
// ───────────────────────────────
// Inline Comments (Paginated)
// ───────────────────────────────
const [comments, setComments] = useState<any[]>([]);
const [commentText, setCommentText] = useState("");
const [loadingComments, setLoadingComments] = useState(false);
const [cursor, setCursor] = useState<any>(null);
const [hasMore, setHasMore] = useState(true);

// Load initial 10 comments
useEffect(() => {
  loadInitialComments();
}, []);

const loadInitialComments = async () => {
  setLoadingComments(true);

  const { comments: newest } = await getCommentsPaginated(item.id, 2);

  setComments(newest);
  setCursor(newest.length > 0 ? newest[newest.length - 1] : null);

  // If we got only 2, we assume more exist → show “load more”
  setHasMore(true);

  setLoadingComments(false);
};

const loadMoreComments = async () => {
  if (loadingComments || !hasMore) return;

  setLoadingComments(true);

  // Load 10 latest comments FROM THE START
  const { comments: tenComments, cursor: newCursor } =
    await getCommentsPaginated(item.id, 10);

  setComments(tenComments);
  setCursor(newCursor);
  setHasMore(tenComments.length === 10);

  setLoadingComments(false);
};


const handleAddComment = async () => {
  if (!commentText.trim()) return;

  await addComment(item.id, commentText.trim());
  setCommentText("");

  // Load the newest comments without resetting cursor incorrectly
  const { comments: newest } = await getCommentsPaginated(item.id, comments.length + 5);

  setComments(newest);
  
  // Set cursor to last item of newest page
  setCursor(newest.length > 0 ? newest[newest.length - 1] : null);

  // Recalculate if more available
  setHasMore(newest.length % 10 === 0);
};

//////////////////////////////////////////////////////////////////////////////
useEffect(() => {
  if (!item?.id) return;

  const likesRef = collection(db, "posts", item.id, "likes");

  const unsubscribe = onSnapshot(likesRef, (snapshot) => {
    const userIds = snapshot.docs.map(doc => doc.id);

    setLikeCount(snapshot.size);

    const myUid = auth.currentUser?.uid;
    setLiked(myUid ? userIds.includes(myUid) : false);
  });

  return unsubscribe;
}, [item.id]);



const onLike = async () => {
  // Optimistic update (UI updates instantly)
  setLiked((prev) => !prev);
  setLikeCount((prev) => (liked ? prev - 1 : prev + 1));

  // Then confirm with DB, no need to await result before updating UI
  await toggleLike(item.id);
};



  const formatLabel = (key: string) => {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: theme.card,
      }}
    >
      {/* HEADER */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Link 
            href={{ pathname: "/member/profile/[uid]", params: { uid: item.ownerId } }}
            asChild
          >
            <TouchableOpacity>
              <Feather name="user" size={20} color={theme.text} />
            </TouchableOpacity>
          </Link>
        </View>

        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700", color: theme.text }}>
            {item.authorName ?? "Member"}
          </Text>
          <Text style={{ fontSize: 12, color: theme.placeholder }}>
            {timeAgo(item.createdAt)} ago
          </Text>
        </View>

        {/* 3 dots menu */}
        {/* 3 dots menu toggle */}
        <TouchableOpacity onPress={() => setMenuOpen(prev => !prev)}>
          <Feather name="more-vertical" size={22} color={theme.text} />
        </TouchableOpacity>

        {/* MENU + BACKDROP */}
        {menuOpen && (
          <>
            {/* BACKDROP to close menu when pressed */}
            <TouchableOpacity
              onPress={() => setMenuOpen(false)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 998,
              }}
            />

            {/* THE MENU */}
            <View
              style={{
                position: "absolute",
                top: 40,
                right: 10,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 8,
                zIndex: 999,
              }}
            >

              {/* REPORT (only if NOT owner) */}
              {!isOwner && (
                <TouchableOpacity
                  onPress={() => {
                    setMenuOpen(false);
                    setShowReport(true);   // ⬅️ open custom report modal
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text style={{ color: theme.text }}>Report Post</Text>
                </TouchableOpacity>
              )}


              {/* EDIT + DELETE (owner only) */}
              {isOwner && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setMenuOpen(false);
                      onEdit(item);
                    }}
                    style={{ paddingVertical: 8 }}
                  >
                    <Text style={{ color: theme.text }}>Edit Post</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setMenuOpen(false);
                      onDelete(item);
                    }}
                    style={{ paddingVertical: 8 }}
                  >
                    <Text style={{ color: "red" }}>Delete Post</Text>
                  </TouchableOpacity>
                </>
              )}

            </View>
          </>
        )}

        {/* REPORT MODAL */}
        <Modal
          visible={showReport}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReport(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "80%",
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: theme.text,
                  marginBottom: 12,
                }}
              >
                Report Post
              </Text>

              <Text
                style={{
                  color: theme.placeholder,
                  marginBottom: 12,
                }}
              >
                Why are you reporting this?
              </Text>

              {/* Options list */}
              {[
                { label: "Spam", reason: "spam" },
                { label: "Inappropriate", reason: "inappropriate" },
                { label: "Harassment", reason: "harassment" },
                { label: "False Info / Misinformation", reason: "misinformation" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.reason}
                  onPress={() => {
                    reportPost(item.id, opt.reason);
                    setShowReport(false);
                  }}
                  style={{
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: theme.text }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}

              {/* Divider */}
              <View
                style={{
                  height: 1,
                  backgroundColor: theme.border,
                  marginVertical: 10,
                }}
              />

              {/* Cancel row */}
              <TouchableOpacity
                onPress={() => setShowReport(false)}
                style={{ paddingVertical: 10 }}
              >
                <Text style={{ color: "red", fontWeight: "600", textAlign: "center" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>

      {/* TITLE */}
      {item.title && (
        <Text
          style={{
            marginTop: 4,
            fontSize: 16,
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {item.title}
        </Text>
      )}

      {/* DESCRIPTION */}
      {item.description && (
        <View style={{ marginTop: 6 }}>
          <Text style={{ color: theme.text, lineHeight: 20 }}>
            {expanded ? item.description : shortDescription}
          </Text>

        {(item.description.length > MAX_CHARS || detailsEntries.length > 0) && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text
              style={{
                marginTop: 4,
                color: theme.primary,
                fontWeight: "600",
              }}
            >
              {expanded ? "Show less" : "Show more"}
            </Text>
          </TouchableOpacity>
        )}

        </View>
      )}

      {/* IMAGE */}
      {item.imageUrl && (
        <Image
          source={{ uri: String(item.imageUrl) }}
          style={{ height: 220, borderRadius: 12, marginTop: 10 }}
          resizeMode="cover"
        />
      )}

      {/* TAGS */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {item.category && <Pill label={String(item.category)} tone="muted" />}
        {item.status && <Pill label={String(item.status)} tone={statusTone(item.status)} />}
        {isOwner && <Pill label="My post" tone="success" />}
      </View>

      {/* ─────────────────────────────── */}
      {/*           FULL DETAILS          */}
      {/* ─────────────────────────────── */}
      {expanded && detailsEntries.length > 0 && (
        <View
          style={{
            marginTop: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.inputBg,
            borderRadius: 10,
            gap: 10,
          }}
        >
          {detailsEntries.map(([key, value]) => (
            <View key={key}>
              <Text style={{ color: theme.placeholder, fontSize: 12 }}>
                {formatLabel(key)}
              </Text>

              <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600" }}>
                {String(value)}
              </Text>
            </View>
          ))}
        </View>
      )}

{/* ─────────────────────────────── */}
{/*            COMMENTS             */}
{/* ─────────────────────────────── */}
<View style={{ marginTop: 14 }}>

  {/* Load more button */}
  {hasMore && (
    <TouchableOpacity onPress={loadMoreComments}>
      <Text style={{ color: theme.primary, fontWeight: "600", marginBottom: 8 }}>
        {loadingComments ? "Loading..." : "Load more comments"}
      </Text>
    </TouchableOpacity>
  )}

  {/* Comments list */}
  {comments.map((c) => (
    <View
      key={c.id}
      style={{
        backgroundColor: theme.inputBg,
        padding: 10,
        borderRadius: 8,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: theme.border,
      }}
    >
      <Text style={{ fontWeight: "700", color: theme.text }}>
        {c.authorName}
      </Text>
      <Text style={{ color: theme.text, marginTop: 2 }}>{c.text}</Text>
    </View>
  ))}

        {/* Add comment input */}
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <TextInput
            placeholder="Write a comment…"
            placeholderTextColor={theme.placeholder}
            value={commentText}
            onChangeText={setCommentText}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          />

          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!commentText.trim()}
            style={{
              backgroundColor: theme.primary,
              padding: 10,
              borderRadius: 8,
            }}
          >
            <Feather name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>






      {/* ACTION BAR */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
      <TouchableOpacity
        onPress={onLike}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        activeOpacity={0.7}
      >
        <Feather
          name={liked ? "thumbs-up" : "thumbs-up"}
          size={18}
          color={liked ? theme.primary : theme.text}
        />
        <Text style={{ color: theme.text }}>
          {likeCount} Likes
        </Text>
      </TouchableOpacity>


        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Comments</Text>
        </TouchableOpacity>
 

      </View>
    </View>
  );
}



function EditPostCard({ post, onSave, onCancel }: any) {
  const { theme } = useAppTheme();

  const [title, setTitle] = useState(post.title);
  const [description, setDescription] = useState(post.description ?? "");
  const [details, setDetails] = useState(post.details ?? {});
  const [picker, setPicker] = useState<null | { key: string; mode: "date" | "time" }>(null);

  const onChangeField = (k: string, v: string) => {
    setDetails((prev: any) => ({ ...prev, [k]: v }));
  };

  // ------------------------------
  // FIX: BUILD A PURE TIME DATE
  // ------------------------------
  const getTimeOnlyDate = (value?: string) => {
    try {
      if (!value) return new Date();

      // Accept values like "18:30" or ISO
      if (value.includes(":") && !value.includes("T")) {
        const [h, m] = value.split(":");
        const d = new Date();
        d.setHours(Number(h), Number(m), 0, 0);
        return d;
      }

      const d = new Date(value);
      if (isNaN(d.getTime())) return new Date();

      const t = new Date();
      t.setHours(d.getHours(), d.getMinutes(), 0, 0);
      return t;
    } catch {
      return new Date();
    }
  };

  // Dynamic fields per category
  const fieldConfigs = useMemo(() => {
    switch (post.category) {
      case "janazah":
        return [
          { k: "deceasedName", label: "Deceased name" },
          { k: "funeralDate", label: "Funeral date" },
          { k: "funeralTime", label: "Funeral time" },
          { k: "mosqueName", label: "Mosque" },
          { k: "address", label: "Address" },
          { k: "burialLocation", label: "Burial location" },
          { k: "contactPhone", label: "Contact phone", keyboardType: "phone-pad" },
        ];
      case "events":
        return [
          { k: "eventDate", label: "Event date" },
          { k: "eventTime", label: "Event time" },
          { k: "venue", label: "Venue" },
          { k: "address", label: "Address" },
          { k: "ticketPrice", label: "Ticket price", keyboardType: "numeric" },
        ];
      case "jobs":
        return [
          { k: "company", label: "Company" },
          { k: "ratePerHour", label: "Rate per hour", keyboardType: "numeric" },
          { k: "employmentType", label: "Employment type" },
          { k: "address", label: "Address" },
          { k: "contactEmail", label: "Contact email", keyboardType: "email-address" },
          { k: "contactPhone", label: "Contact phone", keyboardType: "phone-pad" },
        ];
      case "pub":
        return [
          { k: "placeName", label: "Place name" },
          { k: "address", label: "Address" },
          { k: "phone", label: "Phone", keyboardType: "phone-pad" },
          { k: "openingHours", label: "Opening hours" },
          { k: "website", label: "Website" },
        ];
      default:
        return [];
    }
  }, [post.category]);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: theme.card,
      }}
    >
      {/* TITLE */}
      <Text style={{ color: theme.text, marginBottom: 6 }}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
          color: theme.text,
          backgroundColor: theme.inputBg,
        }}
      />

      {/* DESCRIPTION */}
      <Text style={{ color: theme.text, marginBottom: 6 }}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        multiline
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          padding: 10,
          minHeight: 100,
          marginBottom: 12,
          color: theme.text,
          backgroundColor: theme.inputBg,
        }}
      />

      {/* DYNAMIC FIELDS */}
      {fieldConfigs.map((cfg) => {
        const key = cfg.k;
        const isDate = key.toLowerCase().includes("date");
        const isTime = key.toLowerCase().includes("time");
        const isDateOrTime = isDate || isTime;

        const displayValue = (() => {
          const v = details[key];
          if (!v) return "";
          try {
            // Manual times (HH:mm)
            if (isTime && v.includes(":") && !v.includes("T")) return v;

            const d = new Date(v);
            if (isNaN(d.getTime())) return String(v);

            if (isDate) return d.toLocaleDateString();
            if (isTime)
              return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

            return String(v);
          } catch {
            return String(v);
          }
        })();

        const showPicker = () =>
          setPicker({ key, mode: isTime ? "time" : "date" });

        return isDateOrTime ? (
          <View key={key} style={{ marginBottom: 12 }}>
            <Text style={{ marginBottom: 6, color: theme.text }}>{cfg.label}</Text>

            <TouchableOpacity onPress={showPicker}>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: theme.inputBg,
                }}
              >
                <Text style={{ color: theme.text }}>
                  {displayValue || `Select ${cfg.label}`}
                </Text>
              </View>
            </TouchableOpacity>

           
          </View>
        ) : (
          <View key={key} style={{ marginBottom: 12 }}>
            <Text style={{ color: theme.text, marginBottom: 6 }}>{cfg.label}</Text>
            <TextInput
              value={details[key] ?? ""}
              onChangeText={(v) => onChangeField(key, v)}
              keyboardType={cfg.keyboardType as any}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 8,
                padding: 10,
                color: theme.text,
                backgroundColor: theme.inputBg,
              }}
            />
          </View>
        );
      })}

      {/* DATE/TIME PICKER */}
      {picker && (
        <DateTimePicker
          value={
            picker.mode === "time"
              ? getTimeOnlyDate(details[picker.key])
              : (details[picker.key] ? new Date(details[picker.key]) : new Date())
          }
          mode={picker.mode}
          display={
            picker.mode === "time"
              ? (Platform.OS === "android" ? "clock" : "spinner")
              : "default"
          }
          onChange={(event: any, selected: Date | undefined) => {
            if (event.type === "dismissed") {
              setPicker(null);
              return;
            }

            if (selected) {
              if (picker.mode === "time") {
                const h = selected.getHours();
                const m = selected.getMinutes();
                const t = `${h.toString().padStart(2, "0")}:${m
                  .toString()
                  .padStart(2, "0")}`;

                setDetails((prev: any) => ({
                  ...prev,
                  [picker.key]: t,
                }));
              } else {
                setDetails((prev: any) => ({
                  ...prev,
                  [picker.key]: selected.toISOString(),
                }));
              }
            }

            setPicker(null);
          }}
        />
      )}

      {/* BUTTONS */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <TouchableOpacity
          onPress={() => onSave({ title, description, details })}
          style={{
            flex: 1,
            backgroundColor: theme.success,
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
            Save
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCancel}
          style={{
            backgroundColor: "red",
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}



function ComposerCard({
  selectedCat,
  onSelectCat,
}: {
  selectedCat: Cat;
  onSelectCat: (c: Cat) => void;
}) {
  const router = useRouter();
  const { theme } = useAppTheme();

  const openComposer = useCallback(() => {
    router.push({ pathname: "/member/posts/new", params: { category: selectedCat } });
  }, [router, selectedCat]);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: theme.card,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Feather name="user" size={18} color={theme.text} />
        </View>

        {/* Faux input */}
        <TouchableOpacity
          onPress={openComposer}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: theme.placeholder }}>What do you want to post today?</Text>
        </TouchableOpacity>
      </View>

      {/* category chips */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {(CATS as readonly Cat[]).map((c) => {
          const active = c === selectedCat;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => onSelectCat(c)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? theme.primary : theme.chipBg,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: active ? "#fff" : theme.text }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* quick actions */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <TouchableOpacity
          onPress={openComposer}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="type" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Create text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openComposer}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="image" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openComposer}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="tag" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Category</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MemberHome() {
  const { theme } = useAppTheme();
  const nav = useNavigation();

  // Hide default Expo Router header
  // ⬇️ THIS FIXES THE “posts/homepage” TITLE ISSUE
  const HideHeader = <Stack.Screen options={{ headerShown: false }} />;

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [catForNew, setCatForNew] = useState<Cat>("janazah");
  const [editingId, setEditingId] = useState<string | null>(null);
  // Load feed
  const load = useCallback(async () => {
    const data = await getPublicFeed(50);
    setItems(data);
  }, []);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) load();
      else setItems([]);
    });
    return unsub;
  }, [load]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Search filter
  const filtered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        String(p.title || "").toLowerCase().includes(q) ||
        String(p.description || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  // Avatar initial
  const avatarLabel =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    "M";
  const avatarInitial = (avatarLabel[0] || "M").toUpperCase();
const onEditPost = (p: any) => {
  setEditingId(p.id);
};

const onDeletePost = async (p: any) => {
  Alert.alert("Delete Post", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Delete",
      style: "destructive",
      onPress: async () => {
        await deletePost(p.id);
        load();
      },
    },
  ]);
};

const onSaveEdit = async (updates: any) => {
  await updatePost(editingId!, {
    title: updates.title,
    description: updates.description,
    details: updates.details,
  });

  setEditingId(null);
  load();
};



return (
  <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
    {HideHeader}

    {/* ✅ Shared global top bar */}
    <TopBar />

    {/* 🔍 Search bar */}
    <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <TextInput
        value={search}
        placeholder="Search posts…"
        onChangeText={setSearch}
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          height: 42,
          backgroundColor: theme.inputBg,
          color: theme.text,
        }}
        placeholderTextColor={theme.placeholder}
      />
    </View>

    {/* 📰 Feed */}
    {!filtered ? (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: theme.text }}>Loading…</Text>
      </View>
    ) : (
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, rowGap: 12 }}
        renderItem={({ item }) => {
          if (editingId === item.id) {
            return (
              <EditPostCard
                post={item}
                onSave={onSaveEdit}
                onCancel={() => setEditingId(null)}
              />
            );
          }

          return (
            <PostCard
              item={item}
              onEdit={onEditPost}
              onDelete={onDeletePost}
            />
          );
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View style={{ rowGap: 12, marginBottom: 12 }}>
            <ComposerCard selectedCat={catForNew} onSelectCat={setCatForNew} />
            <Text style={{ fontWeight: "700", color: theme.text }}>
              Latest posts
            </Text>
          </View>
        }
      />
    )}
  </SafeAreaView>
);

}



