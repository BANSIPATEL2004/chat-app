import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

export const formatMessageTime = (date) => {
  const d = new Date(date);
  return format(d, "HH:mm");
};

export const formatLastSeen = (date) => {
  if (!date) return "Unknown";
  const d = new Date(date);
  if (isToday(d)) return `Today at ${format(d, "HH:mm")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "HH:mm")}`;
  return format(d, "MMM d, HH:mm");
};

export const formatConversationTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
};

export const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};
