export default function Avatar({ src, name = "", size = 40, style = {} }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.4, ...style }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "flex";
          }}
        />
      ) : null}
      <div
        className="avatar-fallback"
        style={{ display: src ? "none" : "flex" }}
      >
        {initials || "?"}
      </div>
    </div>
  );
}
