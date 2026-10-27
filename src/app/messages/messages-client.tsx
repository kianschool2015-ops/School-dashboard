"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Paperclip,
  Send,
  User,
  Users,
  Radio,
  Plus,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Download,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Unlock,
  Archive,
  Ghost,
  UserPlus,
  UserMinus,
  ShieldCheck,
  GraduationCap,
  RefreshCw,
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Edit3,
  Volume2,
} from "lucide-react";
import { toPersianDigits } from "@/lib/jalali";
import {
  sendDirectMessageAction,
  getThreadClosureStatusAction,
  toggleThreadClosureAction,
  pollDirectMessagesAction,
  markDirectMessagesAsReadAction,
  deleteDirectMessageAction,
} from "@/server/actions/messages";
import {
  createConversationAction,
  sendMessageAction,
  addMemberToConversationAction,
  removeMemberFromConversationAction,
  toggleConversationGhostModeAction,
  bulkAddMembersByCourseAction,
  bulkAddMembersByMentorAction,
  editConversationAction,
  deleteConversationAction,
  deleteChatMessageAction,
} from "@/server/actions/chat";
import type {
  DirectMessageRecord,
  ChatConversationRecord,
  ChatMessageRecord,
  ConversationType,
} from "@/types/models";

interface Contact {
  id: string;
  fullName: string;
  role: string;
  rawRole?: "STUDENT" | "MENTOR" | "SUPERVISOR" | "CEO" | "ADMIN";
  category?: "STUDENTS" | "MENTORS" | "LEADERSHIP";
  phoneNumber: string;
  canInitiate?: boolean;
}

interface MessagesClientProps {
  currentUser: {
    id: string;
    fullName: string;
    role: string;
  };
  contacts: Contact[];
  initialMessages: DirectMessageRecord[];
  initialConversations?: ChatConversationRecord[];
  initialChatMessages?: ChatMessageRecord[];
  isManager?: boolean;
  canUseGhostMode?: boolean;
  allConversations?: ChatConversationRecord[];
  allDirectMessages?: DirectMessageRecord[];
  allUsersList?: Array<{ id: string; fullName: string; role: string }>;
}

export function MessagesClient({
  currentUser,
  contacts,
  initialMessages,
  initialConversations = [],
  initialChatMessages = [],
  isManager = false,
  canUseGhostMode = false,
  allConversations = [],
  allDirectMessages = [],
  allUsersList = [],
}: MessagesClientProps) {
  // Navigation mode: "DIRECT" | "CHANNELS" | "GROUPS" | "OMNISCIENT"
  const [activeCategory, setActiveCategory] = useState<"DIRECT" | "CHANNELS" | "GROUPS" | "OMNISCIENT">("DIRECT");

  // Contact Category Tabs (Requirement 4.4: Completely remove STUDENTS tab for student user)
  const isStudentUser = currentUser.role === "STUDENT";
  const [contactSubTab, setContactSubTab] = useState<"STUDENTS" | "MENTORS" | "LEADERSHIP">(
    isStudentUser ? "MENTORS" : "STUDENTS"
  );

  // Ghost / Incognito Monitoring Mode (Requirement 5)
  const [isGhostMode, setIsGhostMode] = useState(false);

  // Group contacts by category
  // If current user is student, studentsContacts is empty (zero student-to-student access)
  const studentsContacts = isStudentUser
    ? []
    : contacts.filter((c) => c.category === "STUDENTS" || c.rawRole === "STUDENT");

  const mentorsContacts = contacts.filter(
    (c) => c.category === "MENTORS" || c.rawRole === "MENTOR"
  );
  const leadershipContacts = contacts.filter(
    (c) =>
      c.category === "LEADERSHIP" ||
      c.rawRole === "SUPERVISOR" ||
      c.rawRole === "CEO" ||
      c.rawRole === "ADMIN"
  );

  const currentTabContacts =
    contactSubTab === "STUDENTS" && !isStudentUser
      ? studentsContacts
      : contactSubTab === "MENTORS"
      ? mentorsContacts
      : leadershipContacts;

  // Auto-switch to first non-empty contact tab if current tab is empty
  useEffect(() => {
    if (contactSubTab === "STUDENTS" && isStudentUser) {
      setContactSubTab("MENTORS");
      return;
    }
    if (studentsContacts.length === 0 && !isStudentUser) {
      if (mentorsContacts.length > 0) {
        setContactSubTab("MENTORS");
      } else if (leadershipContacts.length > 0) {
        setContactSubTab("LEADERSHIP");
      }
    }
  }, [studentsContacts.length, mentorsContacts.length, leadershipContacts.length, isStudentUser, contactSubTab]);

  // Direct chat state
  const defaultContact = isStudentUser
    ? mentorsContacts[0] || leadershipContacts[0] || null
    : contacts[0] || null;
  const [selectedContact, setSelectedContact] = useState<Contact | null>(defaultContact);
  const [directMessages, setDirectMessages] = useState<DirectMessageRecord[]>(initialMessages);

  // Thread closure state (Requirement 4.2: Supervisor Chat Closure)
  const [isThreadClosed, setIsThreadClosed] = useState(false);
  const [threadClosedLoading, setThreadClosedLoading] = useState(false);

  // Check closure status when selected contact changes
  useEffect(() => {
    if (!selectedContact) {
      setIsThreadClosed(false);
      return;
    }
    let active = true;
    getThreadClosureStatusAction(selectedContact.id).then((status) => {
      if (active) {
        setIsThreadClosed(status.isClosed);
      }
    });

    // Mark messages as read upon viewing thread (Section 6)
    markDirectMessagesAsReadAction(selectedContact.id).then((res) => {
      if (active && res.success && res.markedCount > 0) {
        setDirectMessages((prev) =>
          prev.map((m) =>
            m.receiverId === currentUser.id && m.senderId === selectedContact.id
              ? { ...m, isRead: true }
              : m
          )
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("mashahir:notifications-updated"));
        }
      }
    });

    return () => {
      active = false;
    };
  }, [selectedContact?.id, currentUser.id]);

  // Real-time synchronization polling every 3.5 seconds (Requirement 4.3)
  useEffect(() => {
    if (activeCategory !== "DIRECT") return;

    const intervalId = setInterval(async () => {
      try {
        const res = await pollDirectMessagesAction(selectedContact?.id);
        if (res && Array.isArray(res.messages)) {
          setDirectMessages(res.messages);
          if (typeof res.isThreadClosed === "boolean") {
            setIsThreadClosed(res.isThreadClosed);
          }
          // If active contact sent messages that are unread, mark them read
          if (
            selectedContact &&
            res.messages.some(
              (m) =>
                m.receiverId === currentUser.id &&
                m.senderId === selectedContact.id &&
                !m.isRead
            )
          ) {
            markDirectMessagesAsReadAction(selectedContact.id).then((markRes) => {
              if (markRes.success && markRes.markedCount > 0) {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("mashahir:notifications-updated")
                  );
                }
              }
            });
          }
        }
      } catch {
        // silent polling catch
      }
    }, 3500);

    return () => clearInterval(intervalId);
  }, [activeCategory, selectedContact?.id, currentUser.id]);

  // Auto-scroll ref (Requirement 4.1)
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Group / Channel state
  const [conversations, setConversations] = useState<ChatConversationRecord[]>(
    isManager && allConversations.length > 0 ? allConversations : initialConversations
  );
  const [selectedConversation, setSelectedConversation] = useState<ChatConversationRecord | null>(
    initialConversations[0] || null
  );
  const [chatMessages, setChatMessages] = useState<ChatMessageRecord[]>(initialChatMessages);

  // Channel Member Management State (Requirement 4.5 & 5)
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedUserToAdd, setSelectedUserToAdd] = useState("");
  const [selectedBulkCourse, setSelectedBulkCourse] = useState("ALL");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);
  const [selectedBulkMentor, setSelectedBulkMentor] = useState("");
  const [isBulkAddingMentor, setIsBulkAddingMentor] = useState(false);
  const [bulkMentorFeedback, setBulkMentorFeedback] = useState<string | null>(null);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [memberFeedback, setMemberFeedback] = useState<string | null>(null);

  const canManageMembers =
    selectedConversation &&
    (currentUser.role === "CEO" ||
      currentUser.role === "ADMIN" ||
      currentUser.role === "SUPERVISOR" ||
      selectedConversation.creatorId === currentUser.id);

  // Input & Attachment
  const [inputText, setInputText] = useState("");
  const [attachment, setAttachment] = useState<{
    file: File;
    name: string;
    size: number;
    type: string;
    base64?: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Channel / Group Dialog State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ConversationType>("CHANNEL");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Unread badge calculations (Requirement 4.6)
  const unreadBySender = directMessages.reduce((acc, m) => {
    if (m.receiverId === currentUser.id && !m.isRead) {
      acc[m.senderId] = (acc[m.senderId] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const unreadStudentsCount = studentsContacts.reduce(
    (acc, c) => acc + (unreadBySender[c.id] || 0),
    0
  );
  const unreadMentorsCount = mentorsContacts.reduce(
    (acc, c) => acc + (unreadBySender[c.id] || 0),
    0
  );
  const unreadLeadershipCount = leadershipContacts.reduce(
    (acc, c) => acc + (unreadBySender[c.id] || 0),
    0
  );
  const totalDirectUnread =
    unreadStudentsCount + unreadMentorsCount + unreadLeadershipCount;

  // Filter direct messages - sorted chronologically (oldest at TOP, newest at BOTTOM - Requirement 4.1)
  const currentDirectThread = directMessages
    .filter(
      (m) =>
        selectedContact &&
        ((m.senderId === currentUser.id && m.receiverId === selectedContact.id) ||
          (m.senderId === selectedContact.id && m.receiverId === currentUser.id))
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Downward hierarchy check (Requirement 5):
  // Students and mentors cannot initiate direct messages to supervisors/executives unless replying to an existing thread
  const isLeadershipContact =
    selectedContact &&
    (selectedContact.category === "LEADERSHIP" ||
      selectedContact.rawRole === "SUPERVISOR" ||
      selectedContact.rawRole === "CEO" ||
      selectedContact.rawRole === "ADMIN");

  const hasIncomingFromContact =
    selectedContact &&
    currentDirectThread.some((m) => m.senderId === selectedContact.id);

  const isDownwardsBlocked =
    Boolean(isLeadershipContact) &&
    (currentUser.role === "STUDENT" || currentUser.role === "MENTOR") &&
    !hasIncomingFromContact;

  // Supervisor chat closure checks (Requirement 4.2)
  const isStudentBlockedByClosure =
    isThreadClosed && currentUser.role === "STUDENT";

  const canSupervisorManageClosure =
    (currentUser.role === "SUPERVISOR" ||
      currentUser.role === "CEO" ||
      currentUser.role === "ADMIN") &&
    selectedContact !== null &&
    (selectedContact.rawRole === "STUDENT" || selectedContact.category === "STUDENTS");

  const handleToggleThreadClosure = async () => {
    if (!selectedContact) return;
    setThreadClosedLoading(true);
    try {
      const nextClosed = !isThreadClosed;
      const res = await toggleThreadClosureAction(selectedContact.id, nextClosed);
      if (res.success) {
        setIsThreadClosed(res.isClosed);
      } else {
        alert(res.message);
      }
    } catch {
      alert("خطا در تغییر وضعیت گفت‌وگو.");
    } finally {
      setThreadClosedLoading(false);
    }
  };

  // Filter conversation messages - sorted chronologically (Requirement 4.1)
  const currentConversationMessages = chatMessages
    .filter(
      (m) => selectedConversation && m.conversationId === selectedConversation.id
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Auto-scroll to bottom on thread changes (Requirement 4.1)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [
    currentDirectThread.length,
    currentConversationMessages.length,
    selectedContact?.id,
    selectedConversation?.id,
  ]);

  const channelsList = conversations.filter((c) => c.type === "CHANNEL");
  const groupsList = conversations.filter((c) => c.type === "GROUP");

  const canCreate = currentUser.role === "CEO" || currentUser.role === "ADMIN" || currentUser.role === "SUPERVISOR" || currentUser.role === "MENTOR";

  const handleBulkAddCourse = async () => {
    if (!selectedConversation) return;
    setIsBulkAdding(true);
    setBulkFeedback(null);
    try {
      const res = await bulkAddMembersByCourseAction({
        conversationId: selectedConversation.id,
        courseNameOrCode: selectedBulkCourse,
      });
      if (res.success && res.memberIds) {
        setBulkFeedback(res.message);
        const updated = { ...selectedConversation, memberIds: res.memberIds };
        setSelectedConversation(updated);
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        setBulkFeedback(res.message || "خطا در افزودن دسته‌جمعی داوطلبان.");
      }
    } catch {
      setBulkFeedback("خطا در برقراری ارتباط با پایگاه داده.");
    } finally {
      setIsBulkAdding(false);
    }
  };

  const handleBulkAddMentor = async () => {
    if (!selectedConversation || !selectedBulkMentor) return;
    setIsBulkAddingMentor(true);
    setBulkMentorFeedback(null);
    try {
      const res = await bulkAddMembersByMentorAction({
        conversationId: selectedConversation.id,
        mentorId: selectedBulkMentor,
      });
      if (res.success && res.memberIds) {
        setBulkMentorFeedback(res.message);
        const updated = { ...selectedConversation, memberIds: res.memberIds };
        setSelectedConversation(updated);
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        setBulkMentorFeedback(res.message || "خطا در افزودن دسته‌جمعی داوطلبان.");
      }
    } catch {
      setBulkMentorFeedback("خطا در برقراری ارتباط با پایگاه داده.");
    } finally {
      setIsBulkAddingMentor(false);
    }
  };

  const handleDeleteDirectMessage = async (msgId: string) => {
    if (!confirm("آیا از حذف این پیام اطمینان دارید؟")) return;
    try {
      const res = await deleteDirectMessageAction(msgId);
      if (res.success) {
        setDirectMessages((prev) => prev.filter((m) => m.id !== msgId));
      } else {
        alert(res.message || "خطا در حذف پیام.");
      }
    } catch {
      alert("خطا در برقراری ارتباط با سرور.");
    }
  };

  const handleDeleteChatMessage = async (msgId: string) => {
    if (!confirm("آیا از حذف این پیام اطمینان دارید؟")) return;
    try {
      const res = await deleteChatMessageAction(msgId);
      if (res.success) {
        setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
      } else {
        alert(res.message || "خطا در حذف پیام.");
      }
    } catch {
      alert("خطا در برقراری ارتباط با سرور.");
    }
  };

  const handleAddMember = async () => {
    if (!selectedConversation || !selectedUserToAdd) return;
    setMemberActionLoading(true);
    setMemberFeedback(null);
    try {
      const res = await addMemberToConversationAction({
        conversationId: selectedConversation.id,
        userId: selectedUserToAdd,
      });
      if (res.success && res.memberIds) {
        setMemberFeedback("عضو جدید با موفقیت اضافه شد.");
        const updated = { ...selectedConversation, memberIds: res.memberIds };
        setSelectedConversation(updated);
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        setSelectedUserToAdd("");
      } else {
        setMemberFeedback(res.message || "خطا در افزودن عضو.");
      }
    } catch {
      setMemberFeedback("خطا در برقراری ارتباط با پایگاه داده.");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedConversation) return;
    setMemberActionLoading(true);
    setMemberFeedback(null);
    try {
      const res = await removeMemberFromConversationAction({
        conversationId: selectedConversation.id,
        userId,
      });
      if (res.success && res.memberIds) {
        setMemberFeedback("عضو با موفقیت از گفتگو حذف شد.");
        const updated = { ...selectedConversation, memberIds: res.memberIds };
        setSelectedConversation(updated);
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      } else {
        setMemberFeedback(res.message || "خطا در حذف عضو.");
      }
    } catch {
      setMemberFeedback("خطا در برقراری ارتباط با پایگاه داده.");
    } finally {
      setMemberActionLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("حجم فایل پیوست نباید بیش از ۱۰ مگابایت باشد.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachment) return;

    setErrorMsg(null);
    setIsSending(true);

    try {
      if (activeCategory === "DIRECT") {
        if (!selectedContact) return;
        const res = await sendDirectMessageAction({
          receiverId: selectedContact.id,
          message: inputText.trim() || (attachment ? `فایل پیوست: ${attachment.name}` : ""),
          attachmentName: attachment?.name,
          attachmentSize: attachment?.size,
          attachmentType: attachment?.type,
          attachmentUrl: attachment?.base64,
        });

        if (res.success && res.messageRecord) {
          setDirectMessages((prev) => [...prev, res.messageRecord]);
          setInputText("");
          setAttachment(null);
          // Auto-reopen thread if sent by leadership
          if (currentUser.role === "SUPERVISOR" || currentUser.role === "CEO" || currentUser.role === "ADMIN") {
            setIsThreadClosed(false);
          }
        } else {
          setErrorMsg(res.message);
        }
      } else {
        // Group or Channel
        if (!selectedConversation) return;

        // Check if student in read-only channel
        if (currentUser.role === "STUDENT" && selectedConversation.type === "CHANNEL") {
          setErrorMsg("این کانال تنها جهت اطلاع‌رسانی یکطرفه است و امکان ارسال پیام برای داوطلبان مسدود می‌باشد.");
          setIsSending(false);
          return;
        }

        const res = await sendMessageAction({
          conversationId: selectedConversation.id,
          message: inputText.trim() || (attachment ? `فایل پیوست: ${attachment.name}` : ""),
          attachmentName: attachment?.name,
          attachmentSize: attachment?.size,
          attachmentType: attachment?.type,
          attachmentUrl: attachment?.base64,
        });

        if (res.success && res.messageRecord) {
          setChatMessages([...chatMessages, res.messageRecord]);
          setInputText("");
          setAttachment(null);
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch {
      setErrorMsg("خطا در ارسال پیام. لطفاً مجدداً تلاش نمایید.");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await createConversationAction({
        title: newTitle.trim(),
        type: newType,
        description: newDesc.trim(),
        isChannelReadOnlyForStudents: true,
      });

      if (res.success && res.conversation) {
        setConversations([...conversations, res.conversation]);
        setSelectedConversation(res.conversation);
        setShowCreateModal(false);
        setNewTitle("");
        setNewDesc("");
        setActiveCategory(newType === "CHANNEL" ? "CHANNELS" : "GROUPS");
      } else {
        alert(res.message || "خطا در ایجاد.");
      }
    } catch {
      alert("خطا در برقراری ارتباط با سرور.");
    } finally {
      setIsCreating(false);
    }
  };

  // Voice Recording State (Requirement 10)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startVoiceRecording = async () => {
    if (currentUser.role === "STUDENT") {
      alert("ارسال پیام صوتی برای داوطلبان مجاز نمی‌باشد.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert("دسترسی به میکروفن برقرار نشد. لطفاً مجوز میکروفن را در مرورگر فعال فرمایید.");
    }
  };

  const stopVoiceRecording = (sendImmediately = true) => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      recorder.stream.getTracks().forEach((track) => track.stop());

      if (sendImmediately && audioBlob.size > 0) {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Audio = reader.result as string;
          setIsSending(true);
          try {
            if (activeCategory === "DIRECT" && selectedContact) {
              const res = await sendDirectMessageAction({
                receiverId: selectedContact.id,
                message: "🎙 پیام صوتی",
                attachmentUrl: base64Audio,
                attachmentName: `voice_${Date.now()}.webm`,
                attachmentSize: audioBlob.size,
                attachmentType: "audio/webm",
              });
              if (res.success && res.messageRecord) {
                setDirectMessages((prev) => [...prev, res.messageRecord!]);
              }
            } else if (selectedConversation) {
              const res = await sendMessageAction({
                conversationId: selectedConversation.id,
                message: "🎙 پیام صوتی",
                attachmentUrl: base64Audio,
                attachmentName: `voice_${Date.now()}.webm`,
                attachmentSize: audioBlob.size,
                attachmentType: "audio/webm",
              });
              if (res.success && res.messageRecord) {
                setChatMessages((prev) => [...prev, res.messageRecord!]);
              }
            }
          } catch {
            alert("خطا در ارسال پیام صوتی.");
          } finally {
            setIsSending(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      }
    };

    recorder.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((track) => track.stop());
    };
    recorder.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  // Edit / Delete conversation modal state (Requirement 15)
  const [showEditConvModal, setShowEditConvModal] = useState(false);
  const [editConvTitle, setEditConvTitle] = useState("");
  const [editConvDesc, setEditConvDesc] = useState("");
  const [editConvReadOnly, setEditConvReadOnly] = useState(false);

  const openEditModal = (conv: ChatConversationRecord) => {
    setEditConvTitle(conv.title);
    setEditConvDesc(conv.description || "");
    setEditConvReadOnly(Boolean(conv.isChannelReadOnlyForStudents));
    setShowEditConvModal(true);
  };

  const handleEditConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConversation || !editConvTitle.trim()) return;
    try {
      const res = await editConversationAction({
        conversationId: selectedConversation.id,
        title: editConvTitle.trim(),
        description: editConvDesc.trim(),
        isChannelReadOnlyForStudents: editConvReadOnly,
      });
      if (res.success) {
        const updated = {
          ...selectedConversation,
          title: editConvTitle.trim(),
          description: editConvDesc.trim(),
          isChannelReadOnlyForStudents: editConvReadOnly,
        };
        setSelectedConversation(updated);
        setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setShowEditConvModal(false);
      } else {
        alert(res.message);
      }
    } catch {
      alert("خطا در ویرایش گفتگو.");
    }
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) return;
    if (!confirm(`آیا از حذف کامل «${selectedConversation.title}» اطمینان دارید؟ تمامی پیام‌ها حذف خواهند شد.`)) return;
    try {
      const res = await deleteConversationAction(selectedConversation.id);
      if (res.success) {
        setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
        setSelectedConversation(null);
      } else {
        alert(res.message);
      }
    } catch {
      alert("خطا در حذف گفتگو.");
    }
  };

  const isCurrentChannelReadOnly =
    activeCategory === "CHANNELS" &&
    currentUser.role === "STUDENT" &&
    selectedConversation?.type === "CHANNEL";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">سامانه جامع پیام‌رسانی و تبادل اسناد</h1>
          <p className="text-sm text-muted-foreground mt-1">
            گفتگوی مستقیم، کانال‌های اطلاعیه، گروه‌های مباحثه درسی و ارسال فایل‌های آموزشی تا ۱۰ مگابایت
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Ghost / Incognito Monitoring Mode (Requirement 5) */}
          {canUseGhostMode && (
            <Button
              variant={isGhostMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsGhostMode(!isGhostMode)}
              className={`flex items-center gap-1.5 text-xs transition-all ${
                isGhostMode
                  ? "bg-purple-700 hover:bg-purple-800 text-white shadow-md border-purple-500"
                  : "text-muted-foreground border-dashed hover:text-foreground"
              }`}
            >
              {isGhostMode ? (
                <Ghost className="h-4 w-4 text-purple-200 animate-pulse" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              <span>{isGhostMode ? "حالت نامحسوس فعال (Ghost Mode)" : "فعال‌سازی نظارت نامحسوس"}</span>
            </Button>
          )}

          {canCreate && (
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="flex items-center gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>ایجاد کانال یا گروه جدید</span>
            </Button>
          )}
        </div>
      </div>

      {/* Ghost Mode Active Alert Banner */}
      {isGhostMode && (
        <div className="p-3.5 bg-purple-950/25 border border-purple-500/40 text-purple-200 rounded-xl text-xs flex items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <Ghost className="h-4 w-4 text-purple-400 shrink-0" />
            <span>
              <strong>حالت نظارت نامحسوس (Incognito/Ghost Mode) فعال است:</strong> حضور و وضعیت خوانده‌شدن پیام‌ها (Read Receipts) برای مخاطبان ثبت نمی‌گردد و دسترسی بدون ردپا در گفتگوها فراهم است.
            </span>
          </div>
          <Badge variant="outline" className="text-purple-300 border-purple-500/50 bg-purple-900/40 text-[10px] shrink-0">
            نظارت نامحسوس مدیریتی
          </Badge>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Category Tabs (Requirement 4.6: Counters only for unread messages) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => { setActiveCategory("DIRECT"); setErrorMsg(null); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategory === "DIRECT"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>گفتگوهای مستقیم</span>
          {totalDirectUnread > 0 && (
            <span className="ms-1.5 px-2 py-0.5 rounded-full text-[10px] bg-red-600 text-white font-bold animate-pulse">
              {toPersianDigits(totalDirectUnread)} پیام خوانده‌نشده
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveCategory("CHANNELS");
            setErrorMsg(null);
            if (channelsList.length > 0 && (!selectedConversation || selectedConversation.type !== "CHANNEL")) {
              setSelectedConversation(channelsList[0]);
            }
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategory === "CHANNELS"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Radio className="h-3.5 w-3.5" />
          <span>کانال‌های اطلاع‌رسانی</span>
        </button>

        <button
          onClick={() => {
            setActiveCategory("GROUPS");
            setErrorMsg(null);
            if (groupsList.length > 0 && (!selectedConversation || selectedConversation.type !== "GROUP")) {
              setSelectedConversation(groupsList[0]);
            }
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeCategory === "GROUPS"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>گروه‌های مباحثه</span>
        </button>

        {isManager && (
          <button
            onClick={() => { setActiveCategory("OMNISCIENT"); setErrorMsg(null); }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeCategory === "OMNISCIENT"
                ? "bg-red-600 text-white shadow-xs"
                : "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            نظارت عالیه مدیرعامل بر تمام پیام‌ها (Omniscient Audit)
          </button>
        )}
      </div>

      {/* Omniscient Audit View for CEO / ADMIN */}
      {activeCategory === "OMNISCIENT" && isManager ? (
        <Card className="border border-red-500/30 bg-red-950/10 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-4">
            <div>
              <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
                <Eye className="h-5 w-5" />
                داشبورد بازرسی عالیه پیام‌ها و گفتگوهای سازمانی مشاهیر دانش
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                دید ۳۶۰ درجه مدیر ارشد: پایش و نظارت کامل بر کلیه پیام‌های مستقیم میان پشتیبانان و داوطلبان، کانال‌ها و گروه‌ها
              </p>
            </div>
            <Badge variant="destructive" className="text-xs">دسترسی فوق‌العاده CEO</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* All Direct Messages */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                سوابق کلیه پیام‌های مستقیم ({allDirectMessages.length} پیام)
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2 bg-background/50 rounded-xl border border-border">
                {allDirectMessages.map((m) => (
                  <div key={m.id} className="p-3 bg-muted/30 rounded-lg text-xs space-y-1 border border-border/50">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">
                        {m.senderName} ➔ {allUsersList.find((u) => u.id === m.receiverId)?.fullName || m.receiverId}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(m.createdAt).toLocaleTimeString("fa-IR")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{m.message}</p>
                    {m.attachmentName && (
                      <span className="text-[10px] text-primary flex items-center gap-1 font-mono">
                        📎 {m.attachmentName} ({(Number(m.attachmentSize || 0) / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* All Channels and Groups */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Radio className="h-4 w-4 text-purple-400" />
                کلیه کانال‌ها و گروه‌های فعال در سامانه ({allConversations.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto p-2 bg-background/50 rounded-xl border border-border">
                {allConversations.map((c) => (
                  <div key={c.id} className="p-3 bg-muted/30 rounded-lg text-xs space-y-1 border border-border/50">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{c.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {c.type === "CHANNEL" ? "کانال اطلاع‌رسانی" : "گروه مباحثه"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{c.description || "بدون توضیحات"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      ایجادکننده: {c.creatorName} ({c.creatorRole}) • اعضا: {c.memberIds.length} نفر
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      ) : (
        /* Regular Two-Column Chat Workspace */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[650px]">
          {/* Left / Contact or Channel List (4 cols) */}
          <Card className="md:col-span-4 h-full flex flex-col border border-border overflow-hidden">
            <CardHeader className="p-3 bg-muted/40 border-b border-border">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span>
                  {activeCategory === "DIRECT"
                    ? "مخاطبان سازمان"
                    : activeCategory === "CHANNELS"
                    ? "کانال‌های اطلاع‌رسانی"
                    : "گروه‌های مباحثه درسی"}
                </span>
              </CardTitle>
            </CardHeader>

            {/* Contact Category Tabs: Requirement 4.4 - Completely remove STUDENTS tab for student user & Requirement 4.6 - Unread counters only */}
            {activeCategory === "DIRECT" && (
              <div
                className={`grid ${
                  isStudentUser ? "grid-cols-2" : "grid-cols-3"
                } gap-1 p-1.5 bg-muted/50 border-b border-border text-[11px] font-bold`}
              >
                {!isStudentUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setContactSubTab("STUDENTS");
                      if (studentsContacts.length > 0) setSelectedContact(studentsContacts[0]);
                    }}
                    className={`py-1.5 px-1 rounded-md text-center transition-all truncate flex items-center justify-center gap-1 ${
                      contactSubTab === "STUDENTS"
                        ? "bg-background text-primary shadow-xs font-black"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span>داوطلبان</span>
                    {unreadStudentsCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-600 text-white font-bold">
                        {toPersianDigits(unreadStudentsCount)} پیام خوانده‌نشده
                      </span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setContactSubTab("MENTORS");
                    if (mentorsContacts.length > 0) setSelectedContact(mentorsContacts[0]);
                  }}
                  className={`py-1.5 px-1 rounded-md text-center transition-all truncate flex items-center justify-center gap-1 ${
                    contactSubTab === "MENTORS"
                      ? "bg-background text-primary shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>پشتیبانان</span>
                  {unreadMentorsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-600 text-white font-bold">
                      {toPersianDigits(unreadMentorsCount)} پیام خوانده‌نشده
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContactSubTab("LEADERSHIP");
                    if (leadershipContacts.length > 0) setSelectedContact(leadershipContacts[0]);
                  }}
                  className={`py-1.5 px-1 rounded-md text-center transition-all truncate flex items-center justify-center gap-1 ${
                    contactSubTab === "LEADERSHIP"
                      ? "bg-background text-primary shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>مدیران</span>
                  {unreadLeadershipCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-600 text-white font-bold">
                      {toPersianDigits(unreadLeadershipCount)} پیام خوانده‌نشده
                    </span>
                  )}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {activeCategory === "DIRECT" ? (
                currentTabContacts.length === 0 ? (
                  <div className="text-center py-10 px-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold">
                      مخاطبی در بخش {contactSubTab === "STUDENTS" ? "داوطلبان" : contactSubTab === "MENTORS" ? "پشتیبانان" : "مدیران و سرپرستان"} یافت نشد.
                    </p>
                    <p className="text-[10px]">
                      {currentUser.role === "STUDENT" && contactSubTab === "LEADERSHIP"
                        ? "پیام به مدیران و سرپرستان صرفاً در صورت ارسال پیام اولیه از سوی ایشان مقدور است."
                        : ""}
                    </p>
                  </div>
                ) : (
                  currentTabContacts.map((contact) => {
                    const isSelected = selectedContact?.id === contact.id;
                    const isLeadership =
                      contact.category === "LEADERSHIP" ||
                      contact.rawRole === "SUPERVISOR" ||
                      contact.rawRole === "CEO" ||
                      contact.rawRole === "ADMIN";
                    const contactUnread = unreadBySender[contact.id] || 0;

                    return (
                      <div
                        key={contact.id}
                        onClick={() => setSelectedContact(contact)}
                        className={`p-3 cursor-pointer transition-colors text-xs flex items-center gap-3 ${
                          isSelected
                            ? "bg-primary/10 border-s-4 border-primary"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              isLeadership
                                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                : contact.category === "MENTORS"
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                                : "bg-primary/15 text-primary"
                            }`}
                          >
                            {contact.fullName.charAt(0)}
                          </div>
                          {contact.canInitiate === false && (
                            <span
                              className="absolute -bottom-1 -end-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs"
                              title="فقط در پاسخ به پیام"
                            >
                              <Lock className="h-2.5 w-2.5" />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="font-bold text-foreground truncate">{contact.fullName}</p>
                            <div className="flex items-center gap-1">
                              {contactUnread > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-[9px] px-1.5 py-0 font-bold shrink-0"
                                >
                                  {toPersianDigits(contactUnread)} پیام
                                </Badge>
                              )}
                              {contact.canInitiate === false && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] text-amber-600 dark:text-amber-400 border-amber-500/30 px-1 py-0 shrink-0 font-normal"
                                >
                                  فقط پاسخ
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{contact.role}</p>
                        </div>
                      </div>
                    );
                  })
                )
              ) : activeCategory === "CHANNELS" ? (
                channelsList.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">کانالی موجود نیست.</p>
                ) : (
                  channelsList.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setSelectedConversation(ch)}
                      className={`p-3 cursor-pointer transition-colors text-xs flex items-center gap-3 ${
                        selectedConversation?.id === ch.id
                          ? "bg-primary/10 border-s-4 border-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-purple-500/15 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Radio className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{ch.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{ch.description || "کانال اطلاعیه"}</p>
                      </div>
                    </div>
                  ))
                )
              ) : groupsList.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">گروهی موجود نیست.</p>
              ) : (
                groupsList.map((grp) => (
                  <div
                    key={grp.id}
                    onClick={() => setSelectedConversation(grp)}
                    className={`p-3 cursor-pointer transition-colors text-xs flex items-center gap-3 ${
                      selectedConversation?.id === grp.id
                        ? "bg-primary/10 border-s-4 border-primary"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">{grp.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{grp.description || "گروه درسی"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Right / Chat Panel (8 cols) */}
          <Card className="md:col-span-8 h-full flex flex-col border border-border overflow-hidden">
            {activeCategory === "DIRECT" && selectedContact ? (
              <>
                {/* Direct Header */}
                <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          isLeadershipContact
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : selectedContact.category === "MENTORS"
                            ? "bg-blue-500/20 text-blue-600 dark:text-blue-400"
                            : "bg-primary/20 text-primary"
                        }`}
                      >
                        {selectedContact.fullName.charAt(0)}
                      </div>
                      {isDownwardsBlocked && (
                        <span
                          className="absolute -bottom-1 -end-1 bg-amber-500 text-white rounded-full p-0.5 shadow-xs"
                          title="شروع پیام مسدود است"
                        >
                          <Lock className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs text-foreground">{selectedContact.fullName}</h3>
                        {isDownwardsBlocked && (
                          <Badge
                            variant="outline"
                            className="text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10 text-[9px]"
                          >
                            فقط در پاسخ به پیام
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{selectedContact.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Supervisor Chat Closure Action Button (Requirement 4.2) */}
                    {canSupervisorManageClosure && (
                      <Button
                        type="button"
                        variant={isThreadClosed ? "outline" : "destructive"}
                        size="sm"
                        disabled={threadClosedLoading}
                        onClick={handleToggleThreadClosure}
                        className={`text-xs flex items-center gap-1.5 h-8 px-2.5 transition-colors ${
                          isThreadClosed
                            ? "border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            : "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                        }`}
                      >
                        {isThreadClosed ? (
                          <>
                            <Unlock className="h-3.5 w-3.5" />
                            <span>بازگشایی مجدد گفت‌وگو</span>
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" />
                            <span>بستن گفت‌وگو (اتمام رسیدگی)</span>
                          </>
                        )}
                      </Button>
                    )}

                    {isThreadClosed && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] bg-red-600 text-white border-0 flex items-center gap-1"
                      >
                        <Lock className="h-3 w-3" />
                        <span>مختومه (اتمام رسیدگی)</span>
                      </Badge>
                    )}

                    {isGhostMode && (
                      <Badge
                        variant="outline"
                        className="text-purple-400 border-purple-500/40 bg-purple-950/30 text-[10px] flex items-center gap-1"
                      >
                        <Ghost className="h-3 w-3" />
                        <span>نظارت نامحسوس</span>
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">گفتگوی مستقیم امن</Badge>
                  </div>
                </div>

                {/* Direct Messages Container (Requirement 4.1: Chronological with auto-scroll) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                  {currentDirectThread.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-xs">
                      هنوز پیامی رد و بدل نشده است. اولین پیام یا فایل خود را ارسال نمایید.
                    </div>
                  ) : (
                    <>
                      {currentDirectThread.map((msg) => {
                        const isMe = msg.senderId === currentUser.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-xs space-y-2 ${
                                isMe
                                  ? "bg-primary text-primary-foreground rounded-br-none"
                                  : "bg-background border border-border text-foreground rounded-bl-none"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b border-white/20 pb-1">
                                <span className="font-bold">{msg.senderName}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono">
                                    {new Date(msg.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {(currentUser.role === "CEO" ||
                                    currentUser.role === "ADMIN" ||
                                    currentUser.role === "SUPERVISOR" ||
                                    msg.senderId === currentUser.id) && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDirectMessage(msg.id)}
                                      className="opacity-70 hover:opacity-100 hover:text-rose-300 transition-opacity p-0.5"
                                      title="حذف پیام"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                              {msg.attachmentName && (
                                msg.attachmentType?.startsWith("audio/") ||
                                msg.attachmentName?.endsWith(".webm") ||
                                msg.attachmentName?.endsWith(".mp3") ? (
                                  <div className="p-2.5 rounded-xl bg-black/10 dark:bg-white/10 space-y-1.5 min-w-[220px]">
                                    <div className="flex items-center gap-2">
                                      <Volume2 className="h-4 w-4 text-primary shrink-0" />
                                      <span className="text-[11px] font-bold">پیام صوتی</span>
                                    </div>
                                    <audio controls className="w-full h-8" src={msg.attachmentUrl}>
                                      مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                                    </audio>
                                  </div>
                                ) : (
                                  <div
                                    className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                      isMe ? "bg-white/10 border-white/20 text-primary-foreground" : "bg-muted/40 border-border text-foreground"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {msg.attachmentType?.includes("image") ? (
                                        <ImageIcon className="h-4 w-4 shrink-0" />
                                      ) : msg.attachmentType?.includes("sheet") || msg.attachmentType?.includes("excel") ? (
                                        <FileSpreadsheet className="h-4 w-4 shrink-0" />
                                      ) : (
                                        <FileText className="h-4 w-4 shrink-0" />
                                      )}
                                      <span className="truncate font-medium">{msg.attachmentName}</span>
                                      {msg.attachmentSize && (
                                        <span className="text-[10px] opacity-75 font-mono">
                                          ({(msg.attachmentSize / 1024 / 1024).toFixed(2)} MB)
                                        </span>
                                      )}
                                    </div>
                                    {msg.attachmentUrl && (
                                      <a
                                        href={msg.attachmentUrl}
                                        download={msg.attachmentName}
                                        className="p-1 hover:bg-black/10 rounded transition-colors"
                                        title="دانلود فایل پیوست"
                                      >
                                        <Download className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </>
            ) : selectedConversation ? (
              <>
                {/* Conversation Header (Channel / Group) */}
                <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                        selectedConversation.type === "CHANNEL"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {selectedConversation.type === "CHANNEL" ? <Radio className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs text-foreground">{selectedConversation.title}</h3>
                        {selectedConversation.isGhostMode && (
                          <Badge
                            variant="outline"
                            className="text-purple-400 border-purple-500/40 bg-purple-950/30 text-[9px] flex items-center gap-1"
                          >
                            <Ghost className="h-2.5 w-2.5" />
                            <span>Ghost Active</span>
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{selectedConversation.description || "مباحثه و اطلاع‌رسانی"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Ghost mode toggle on conversation for supervisor/manager */}
                    {canUseGhostMode && (
                      <button
                        type="button"
                        onClick={async () => {
                          const nextGhost = !selectedConversation.isGhostMode;
                          await toggleConversationGhostModeAction({
                            conversationId: selectedConversation.id,
                            isGhostMode: nextGhost,
                          });
                          const updated = { ...selectedConversation, isGhostMode: nextGhost };
                          setSelectedConversation(updated);
                          setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                          selectedConversation.isGhostMode
                            ? "bg-purple-900/40 text-purple-300 border-purple-500/50"
                            : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                        }`}
                        title="فعال‌سازی حالت نامحسوس روی این گفتگو"
                      >
                        <Ghost className="h-3 w-3" />
                        <span>{selectedConversation.isGhostMode ? "Ghost On" : "Ghost Off"}</span>
                      </button>
                    )}

                    {/* Member Management Button (Requirement 5) */}
                    {canManageMembers && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowMemberModal(true);
                          setMemberFeedback(null);
                        }}
                        className="text-xs flex items-center gap-1 h-7 px-2.5 border-dashed"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>مدیریت اعضا ({toPersianDigits(selectedConversation.memberIds.length)})</span>
                      </Button>
                    )}

                    {/* Edit & Delete conversation buttons (Requirement 15: Full Admin CRUD) */}
                    {canManageMembers && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(selectedConversation)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          title="ویرایش مشخصات"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDeleteConversation}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600"
                          title="حذف کانال/گروه"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    <Badge variant="outline" className="text-[10px]">
                      {selectedConversation.type === "CHANNEL" ? "کانال اطلاع‌رسانی" : "گروه مباحثه"}
                    </Badge>
                  </div>
                </div>

                {/* Conversation Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                  {currentConversationMessages.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-xs">
                      هنوز هیچ پیامی در این {selectedConversation.type === "CHANNEL" ? "کانال" : "گروه"} ارسال نشده است.
                    </div>
                  ) : (
                    <>
                      {currentConversationMessages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-start" : "justify-end"}`}>
                          <div
                            className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-xs space-y-2 ${
                              isMe
                                ? "bg-primary text-primary-foreground rounded-br-none"
                                : "bg-background border border-border text-foreground rounded-bl-none"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b border-white/20 pb-1">
                              <span className="font-bold">{msg.senderName} ({msg.senderRole})</span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono">
                                  {new Date(msg.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {(currentUser.role === "CEO" ||
                                  currentUser.role === "ADMIN" ||
                                  currentUser.role === "SUPERVISOR" ||
                                  msg.senderId === currentUser.id) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChatMessage(msg.id)}
                                    className="opacity-70 hover:opacity-100 hover:text-rose-300 transition-opacity p-0.5"
                                    title="حذف پیام"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                            {msg.attachmentName && (
                              msg.attachmentType?.startsWith("audio/") ||
                              msg.attachmentName?.endsWith(".webm") ||
                              msg.attachmentName?.endsWith(".mp3") ? (
                                <div className="p-2.5 rounded-xl bg-black/10 dark:bg-white/10 space-y-1.5 min-w-[220px]">
                                  <div className="flex items-center gap-2">
                                    <Volume2 className="h-4 w-4 text-primary shrink-0" />
                                    <span className="text-[11px] font-bold">پیام صوتی</span>
                                  </div>
                                  <audio controls className="w-full h-8" src={msg.attachmentUrl}>
                                    مرورگر شما از پخش صدا پشتیبانی نمی‌کند.
                                  </audio>
                                </div>
                              ) : (
                                <div
                                  className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                                    isMe ? "bg-white/10 border-white/20 text-primary-foreground" : "bg-muted/40 border-border text-foreground"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {msg.attachmentType?.includes("image") ? (
                                      <ImageIcon className="h-4 w-4 shrink-0" />
                                    ) : msg.attachmentType?.includes("sheet") || msg.attachmentType?.includes("excel") ? (
                                      <FileSpreadsheet className="h-4 w-4 shrink-0" />
                                    ) : (
                                      <FileText className="h-4 w-4 shrink-0" />
                                    )}
                                    <span className="truncate font-medium">{msg.attachmentName}</span>
                                    {msg.attachmentSize && (
                                      <span className="text-[10px] opacity-75 font-mono">
                                        ({(msg.attachmentSize / 1024 / 1024).toFixed(2)} MB)
                                      </span>
                                    )}
                                  </div>
                                  {msg.attachmentUrl && (
                                    <a
                                      href={msg.attachmentUrl}
                                      download={msg.attachmentName}
                                      className="p-1 hover:bg-black/10 rounded transition-colors"
                                      title="دانلود فایل پیوست"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              گفتگویی انتخاب نشده است.
            </div>
          )}

          {/* Selected Attachment Preview Bar */}
          {attachment && (
            <div className="p-2 bg-muted/60 border-t border-border flex items-center justify-between text-xs px-4">
              <div className="flex items-center gap-2 text-foreground truncate">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold truncate">{attachment.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({(attachment.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <button
                onClick={() => setAttachment(null)}
                className="text-muted-foreground hover:text-red-500"
                title="حذف پیوست"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Chat Input Bar (Requirement 4.2: Disabled when chat closed by Supervisor) */}
          {isStudentBlockedByClosure ? (
            <div className="p-4 bg-red-500/10 border-t border-red-500/30 text-red-800 dark:text-red-300 text-xs flex items-center gap-3">
              <Lock className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <span className="font-semibold leading-relaxed">
                این گفت‌وگو توسط سرپرست آموزشی مختومه اعلام شده است و امکان ارسال پیام جدید وجود ندارد.
              </span>
            </div>
          ) : activeCategory === "DIRECT" && isDownwardsBlocked ? (
            <div className="p-4 bg-amber-500/10 border-t border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3">
              <Lock className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-foreground">سلسله‌مراتب ارتباطات سازمانی: شروع پیام مستقیم جدید مسدود است</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  داوطلبان و پشتیبانان امکان ارسال پیام مستقیم به مدیران و سرپرستان را ندارند مگر در پاسخ به پیامی که از جانب ایشان آغاز شده باشد.
                  {currentUser.role === "STUDENT" && " برای ارسال موارد ضروری، از بخش تنظیمات «تیکت ارجاع به سرپرست» ثبت فرمایید."}
                </p>
              </div>
            </div>
          ) : isCurrentChannelReadOnly ? (
            <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-4 w-4 text-amber-500" />
              <span>این کانال به صورت یکطرفه و فقط جهت اطلاعیه‌های اساتید و سرپرستان تنظیم شده است.</span>
            </div>
          ) : isRecording ? (
            <div className="p-3 bg-rose-500/10 border-t border-rose-500/30 flex items-center justify-between gap-3 text-xs w-full">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold">
                <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping shrink-0" />
                <span>در حال ضبط پیام صوتی:</span>
                <span className="font-mono text-sm">
                  {Math.floor(recordingSeconds / 60).toString().padStart(2, "0")}:
                  {(recordingSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={cancelVoiceRecording}
                  className="text-xs text-muted-foreground h-8"
                >
                  لغو
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => stopVoiceRecording(true)}
                  className="text-xs bg-rose-600 hover:bg-rose-700 text-white h-8"
                >
                  <Send className="h-3.5 w-3.5 ms-1.5" />
                  <span>ارسال صدا</span>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-3 bg-background border-t border-border flex items-center gap-2">
              <label className="cursor-pointer p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                <Paperclip className="h-5 w-5" />
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webm,.mp3"
                  className="hidden"
                />
              </label>

              {currentUser.role !== "STUDENT" && (
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-rose-500 transition-colors"
                  title="ضبط و ارسال پیام صوتی (وویس)"
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="پیام خود را بنویسید... (یا فایل پیوست کنید تا ۱۰MB)"
                className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
              />

              <Button
                type="submit"
                size="sm"
                disabled={isSending || (!inputText.trim() && !attachment)}
                className="bg-primary text-primary-foreground"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
          </Card>
        </div>
      )}

      {/* Modal: Create Channel or Group */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md border border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold">ایجاد کانال یا گروه مباحثه جدید</CardTitle>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateConversation} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">نوع فضا</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewType("CHANNEL")}
                      className={`p-2 rounded-lg border text-center font-bold flex items-center justify-center gap-1.5 ${
                        newType === "CHANNEL" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <Radio className="h-4 w-4" />
                      کانال اطلاع‌رسانی
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewType("GROUP")}
                      className={`p-2 rounded-lg border text-center font-bold flex items-center justify-center gap-1.5 ${
                        newType === "GROUP" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      گروه مباحثه درسی
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">نام کانال یا گروه</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="مثال: کانال اطلاعیه‌های آزمون وکالت کانون مرکز"
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">توضیحات و اهداف فضا</label>
                  <textarea
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="شرح کوتاه درباره محتوا و قوانین این فضا..."
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                    انصراف
                  </Button>
                  <Button type="submit" size="sm" disabled={isCreating || !newTitle.trim()}>
                    {isCreating ? "در حال ایجاد..." : "ایجاد و انتشار"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Edit Channel or Group (Requirement 15: Full Admin CRUD) */}
      {showEditConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md border border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-bold">ویرایش مشخصات کانال یا گروه</CardTitle>
              <button onClick={() => setShowEditConvModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditConversation} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">عنوان گفتگو</label>
                  <input
                    type="text"
                    value={editConvTitle}
                    onChange={(e) => setEditConvTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">توضیحات</label>
                  <textarea
                    rows={3}
                    value={editConvDesc}
                    onChange={(e) => setEditConvDesc(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editReadOnlyCheck"
                    checked={editConvReadOnly}
                    onChange={(e) => setEditConvReadOnly(e.target.checked)}
                    className="rounded border-border text-primary"
                  />
                  <label htmlFor="editReadOnlyCheck" className="text-xs text-muted-foreground cursor-pointer">
                    فقط خواندنی برای داوطلبان (ارسال پیام مسدود باشد)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowEditConvModal(false)}>
                    انصراف
                  </Button>
                  <Button type="submit" size="sm" disabled={!editConvTitle.trim()}>
                    ذخیره تغییرات
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Channel Member Management (Requirement 5) */}
      {showMemberModal && selectedConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg border border-border shadow-2xl bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  مدیریت اعضای {selectedConversation.type === "CHANNEL" ? "کانال" : "گروه"}: {selectedConversation.title}
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  افزودن عضو جدید یا حذف اعضای فعلی از این فضا
                </p>
              </div>
              <button
                onClick={() => setShowMemberModal(false)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {memberFeedback && (
                <div className="p-2.5 bg-primary/10 border border-primary/30 rounded-lg text-primary text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{memberFeedback}</span>
                </div>
              )}

              {/* Bulk Add by Course (Requirement 4.5) */}
              {(currentUser.role === "CEO" ||
                currentUser.role === "ADMIN" ||
                currentUser.role === "SUPERVISOR") && (
                <div className="space-y-2 bg-primary/5 p-3 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span>افزودن دسته‌جمعی بر اساس دوره آموزشی</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    افزودن کلیه داوطلبان یک دوره آموزشی به این گفتگو با یک کلیک:
                  </p>
                  {bulkFeedback && (
                    <div className="p-2 bg-primary/10 border border-primary/30 rounded-lg text-primary text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{bulkFeedback}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <select
                      value={selectedBulkCourse}
                      onChange={(e) => setSelectedBulkCourse(e.target.value)}
                      className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
                    >
                      <option value="ALL">کلیه داوطلبان دارای اشتراک فعال (همه دوره‌ها)</option>
                      <option value="دوره جامع مستر وکالت">دوره جامع مستر وکالت</option>
                      <option value="دوره ضربتی آزمون وکالت">دوره ضربتی آزمون وکالت</option>
                      <option value="کلاس نجات پاییز ۱۴۰۵">کلاس نجات پاییز ۱۴۰۵</option>
                      <option value="دوره جامع آمادگی آزمون وکالت ۳۶۰">دوره جامع آمادگی آزمون وکالت ۳۶۰</option>
                    </select>
                    <Button
                      size="sm"
                      onClick={handleBulkAddCourse}
                      disabled={isBulkAdding}
                      className="bg-primary text-primary-foreground gap-1.5 shrink-0"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>{isBulkAdding ? "در حال ثبت..." : "افزودن دسته‌جمعی"}</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Bulk Add by Mentor's Students (Item 5) */}
              {(currentUser.role === "CEO" ||
                currentUser.role === "ADMIN" ||
                currentUser.role === "SUPERVISOR" ||
                currentUser.role === "MENTOR") && (
                <div className="space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span>افزودن دسته‌جمعی داوطلبان پشتیبان</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    افزودن کلیه داوطلبان تحت نظارت یک پشتیبان به این گفتگو با یک کلیک:
                  </p>
                  {bulkMentorFeedback && (
                    <div className="p-2 bg-indigo-100/50 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 rounded-lg text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>{bulkMentorFeedback}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <select
                      value={selectedBulkMentor}
                      onChange={(e) => setSelectedBulkMentor(e.target.value)}
                      className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
                    >
                      <option value="">-- انتخاب پشتیبان آموزشی --</option>
                      {allUsersList
                        .filter(
                          (u) =>
                            u.role === "MENTOR" &&
                            (currentUser.role !== "MENTOR" || u.id === currentUser.id)
                        )
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.fullName}
                          </option>
                        ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={handleBulkAddMentor}
                      disabled={isBulkAddingMentor || !selectedBulkMentor}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0 text-xs"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {isBulkAddingMentor ? "در حال ثبت..." : "افزودن دسته‌جمعی داوطلبان پشتیبان"}
                      </span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Add Single Member Form */}
              <div className="space-y-2 bg-muted/30 p-3 rounded-xl border border-border">
                <label className="block font-bold text-foreground">افزودن کاربر به صورت فردی</label>
                <div className="flex gap-2">
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className="flex-1 text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
                  >
                    <option value="">-- انتخاب کاربر از پایگاه داده --</option>
                    {allUsersList
                      .filter((u) => !selectedConversation.memberIds.includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.role === "STUDENT" ? "داوطلب" : u.role === "MENTOR" ? "پشتیبان" : u.role === "SUPERVISOR" ? "سرپرست" : "مدیر"})
                        </option>
                      ))}
                  </select>
                  <Button
                    size="sm"
                    onClick={handleAddMember}
                    disabled={!selectedUserToAdd || memberActionLoading}
                    className="bg-primary text-primary-foreground gap-1.5 shrink-0"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>افزودن</span>
                  </Button>
                </div>
              </div>

              {/* Current Members List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>اعضای فعلی گفتگو ({toPersianDigits(selectedConversation.memberIds.length)} نفر)</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-border/60 border border-border rounded-xl bg-background">
                  {selectedConversation.memberIds.map((memberId) => {
                    const userInfo = allUsersList.find((u) => u.id === memberId);
                    const isCreator = memberId === selectedConversation.creatorId;
                    return (
                      <div key={memberId} className="p-2.5 flex items-center justify-between gap-2 hover:bg-muted/20">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {userInfo?.fullName.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">
                              {userInfo?.fullName || memberId}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {userInfo?.role === "STUDENT"
                                ? "داوطلب"
                                : userInfo?.role === "MENTOR"
                                ? "پشتیبان"
                                : userInfo?.role === "SUPERVISOR"
                                ? "سرپرست"
                                : userInfo?.role === "CEO" || userInfo?.role === "ADMIN"
                                ? "مدیریت ارشد"
                                : "کاربر"}{" "}
                              {isCreator && "• ایجادکننده فضا"}
                            </p>
                          </div>
                        </div>
                        {!isCreator && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(memberId)}
                            disabled={memberActionLoading}
                            className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs gap-1"
                          >
                            <UserMinus className="h-3 w-3" />
                            <span>حذف</span>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowMemberModal(false)}>
                  بستن پنجره
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
