"use client";

import React, { useState } from "react";
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
  CheckCircle2,
  Lock,
} from "lucide-react";
import { sendDirectMessageAction } from "@/server/actions/messages";
import { createConversationAction, sendMessageAction } from "@/server/actions/chat";
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
  phoneNumber: string;
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
  allConversations = [],
  allDirectMessages = [],
  allUsersList = [],
}: MessagesClientProps) {
  // Navigation mode: "DIRECT" | "CHANNELS" | "GROUPS" | "OMNISCIENT"
  const [activeCategory, setActiveCategory] = useState<"DIRECT" | "CHANNELS" | "GROUPS" | "OMNISCIENT">("DIRECT");

  // Direct chat state
  const [selectedContact, setSelectedContact] = useState<Contact | null>(contacts[0] || null);
  const [directMessages, setDirectMessages] = useState<DirectMessageRecord[]>(initialMessages);

  // Group / Channel state
  const [conversations, setConversations] = useState<ChatConversationRecord[]>(
    isManager && allConversations.length > 0 ? allConversations : initialConversations
  );
  const [selectedConversation, setSelectedConversation] = useState<ChatConversationRecord | null>(
    initialConversations[0] || null
  );
  const [chatMessages, setChatMessages] = useState<ChatMessageRecord[]>(initialChatMessages);

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

  // Filter direct messages
  const currentDirectThread = directMessages.filter(
    (m) =>
      selectedContact &&
      ((m.senderId === currentUser.id && m.receiverId === selectedContact.id) ||
        (m.senderId === selectedContact.id && m.receiverId === currentUser.id))
  );

  // Filter conversation messages
  const currentConversationMessages = chatMessages.filter(
    (m) => selectedConversation && m.conversationId === selectedConversation.id
  );

  const channelsList = conversations.filter((c) => c.type === "CHANNEL");
  const groupsList = conversations.filter((c) => c.type === "GROUP");

  const canCreate = currentUser.role === "CEO" || currentUser.role === "ADMIN" || currentUser.role === "SUPERVISOR" || currentUser.role === "MENTOR";

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
          setDirectMessages([...directMessages, res.messageRecord]);
          setInputText("");
          setAttachment(null);
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

        if (res.success && res.data) {
          setChatMessages([...chatMessages, res.data]);
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

        {canCreate && (
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground shadow-xs self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>ایجاد کانال یا گروه جدید</span>
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Category Tabs */}
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
          گفتگوهای مستقیم ({contacts.length})
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
          کانال‌های اطلاعیه ({channelsList.length})
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
          گروه‌های مباحثه ({groupsList.length})
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
                      <span className="font-bold text-foreground">{m.senderName} ➔ {m.receiverId}</span>
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
                    ? `مخاطبان مجاز شما (${contacts.length})`
                    : activeCategory === "CHANNELS"
                    ? `کانال‌های اطلاع‌رسانی (${channelsList.length})`
                    : `گروه‌های مباحثه درسی (${groupsList.length})`}
                </span>
              </CardTitle>
            </CardHeader>

            <div className="flex-1 overflow-y-auto divide-y divide-border/60">
              {activeCategory === "DIRECT" ? (
                contacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">مخاطبی یافت نشد.</p>
                ) : (
                  contacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => setSelectedContact(contact)}
                      className={`p-3 cursor-pointer transition-colors text-xs flex items-center gap-3 ${
                        selectedContact?.id === contact.id
                          ? "bg-primary/10 border-s-4 border-primary"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {contact.fullName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{contact.fullName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{contact.role}</p>
                      </div>
                    </div>
                  ))
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
                <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                      {selectedContact.fullName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-foreground">{selectedContact.fullName}</h3>
                      <p className="text-[10px] text-muted-foreground">{selectedContact.role}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">گفتگوی مستقیم امن</Badge>
                </div>

                {/* Direct Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                  {currentDirectThread.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-xs">
                      هنوز پیامی رد و بدل نشده است. اولین پیام یا فایل خود را ارسال نمایید.
                    </div>
                  ) : (
                    currentDirectThread.map((msg) => {
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
                              <span className="font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                            {msg.attachmentName && (
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
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : selectedConversation ? (
              <>
                {/* Conversation Header (Channel / Group) */}
                <div className="p-3 bg-muted/30 border-b border-border flex items-center justify-between">
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
                      <h3 className="font-bold text-xs text-foreground">{selectedConversation.title}</h3>
                      <p className="text-[10px] text-muted-foreground">{selectedConversation.description || "مباحثه و اطلاع‌رسانی"}</p>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-[10px]">
                    {selectedConversation.type === "CHANNEL" ? "کانال اطلاع‌رسانی" : "گروه مباحثه"}
                  </Badge>
                </div>

                {/* Conversation Messages Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                  {currentConversationMessages.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground text-xs">
                      هنوز هیچ پیامی در این {selectedConversation.type === "CHANNEL" ? "کانال" : "گروه"} ارسال نشده است.
                    </div>
                  ) : (
                    currentConversationMessages.map((msg) => {
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
                              <span className="font-mono">
                                {new Date(msg.createdAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>

                            <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>

                            {msg.attachmentName && (
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
                            )}
                          </div>
                        </div>
                      );
                    })
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

            {/* Chat Input Bar */}
            {isCurrentChannelReadOnly ? (
              <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-4 w-4 text-amber-500" />
                <span>این کانال به صورت یکطرفه و فقط جهت اطلاعیه‌های اساتید و سرپرستان تنظیم شده است.</span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-3 bg-background border-t border-border flex items-center gap-2">
                <label className="cursor-pointer p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors">
                  <Paperclip className="h-5 w-5" />
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                </label>

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
    </div>
  );
}
