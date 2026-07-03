export default function Avatar({ user, size = "md", showOnline = false, isOnline = false }) {
  const sizes = {
    xs: "w-7 h-7 text-xs",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-xl",
  };

  return (
    <div className="relative flex-shrink-0">
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={user.username}
          className={`${sizes[size]} rounded-full object-cover bg-surface-800 ring-2 ring-surface-700 transition-opacity duration-300`}
          onError={(e) => { 
            e.target.onerror = null; // Prevent infinite loop
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div 
        className={`${sizes[size]} rounded-full bg-brand-600 flex items-center justify-center font-bold text-white ring-2 ring-surface-700 shadow-inner ${user?.avatar ? 'hidden' : 'flex'}`}
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
      >
        {(user?.username || user?.name || "?")[0].toUpperCase()}
      </div>
      {showOnline && (
        <span className={isOnline ? "online-dot" : "offline-dot"} />
      )}
    </div>
  );
}
