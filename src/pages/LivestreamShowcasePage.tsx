import { useState, useEffect, useRef, useCallback, type ChangeEvent, type SyntheticEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { spring, SlideIn } from "../lib/ios-motion";
import {
  ArrowLeft,
  Camera,
  Gauge,
  Star,
  Lightbulb,
  Sliders,
  Cable,
  Mic,
  Settings,
  Zap,
  TriangleAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

// ─── TikTok Mockup Types & Data ──────────────────────────────────────────────
interface HeartParticle {
  id: number;
  rightPct: number;
  size: number;
  color: string;
  targetY: number;
  targetX: number;
  duration: number;
}

interface ComplimentBubble {
  id: number;
  text: string;
  leftPct: number;
}

interface GiftParticle {
  id: number;
  rightPct: number;
  emoji: string;
  targetY: number;
  targetX: number;
  duration: number;
  scale: number;
}

interface FeedComment {
  id: number;
  user: string;
  text: string;
  color: string;
  avatar: string;
}

interface VideoSourceOption {
  deviceId: string;
  label: string;
  note: string;
  score: number;
  recommended: boolean;
}

interface SonyReason {
  id: number;
  title: string;
  hook: string;
  benefit: string;
  imageUrl: string;
  youtubeVideoId?: string;
  chips: string[];
  details: string[];
  icon: React.ComponentType<{ className?: string }>;
  tone: "cool" | "warm" | "warning";
}

const HEART_COLORS = ['#ff6b6b', '#ff8787', '#ff6b9d', '#c44569', '#f8b500', '#ff6b35'];
const COMPLIMENT_TEXTS = [
  "Sony lên màu đẹp quá! 📸",
  "Hình Sony nét căng luôn! ✨",
  "Màu da từ Sony nhìn xịn ghê 🎬",
  "Chất lượng hình ảnh quá pro! 🔥",
  "Sony stream đẹp khỏi chỉnh 🎥",
  "Dynamic range đỉnh thật 🌟",
  "Màu cinematic quá đã mắt 🎨",
  "Ảnh Sony quá mượt luôn 🚀",
];

const COMMENT_POOL: FeedComment[] = [
  {
    id: 0,
    user: "Minh Pro",
    text: "Màu Sony đẹp quá, da người lên cực mịn!",
    color: "text-cyan-400",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=MinhPro",
  },
  {
    id: 1,
    user: "Lan Studio",
    text: "Độ nét đỉnh thật, nhìn như TVC luôn.",
    color: "text-pink-400",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=LanStudio",
  },
  {
    id: 2,
    user: "Huy Media",
    text: "Dynamic range Sony quá ổn, không cháy highlight.",
    color: "text-yellow-400",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=HuyMedia",
  },
  {
    id: 3,
    user: "Khanh Film",
    text: "Tone màu cinematic, xem đã mắt ghê.",
    color: "text-green-400",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=KhanhFilm",
  },
  {
    id: 4,
    user: "An Creator",
    text: "Chất lượng hình ảnh Sony đúng là khác biệt!",
    color: "text-purple-400",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=AnCreator",
  },
  {
    id: 5,
    user: "Trung Live",
    text: "Chi tiết quá tốt, zoom vẫn nét căng.",
    color: "text-orange-400",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=TrungLive",
  },
  {
    id: 6,
    user: "Mai Visual",
    text: "Sony stream mà tưởng quay hậu kỳ rồi.",
    color: "text-blue-400",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=MaiVisual",
  },
];

const GIFT_EMOJIS = ["🎁", "🌹", "💎", "🏆", "🔥", "🚀", "💐", "⭐"];
const CAMERA_BASE_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1080 },
  height: { ideal: 1920 },
  frameRate: { ideal: 30, max: 60 },
};
const CONFLICTING_CAMERA_PATTERNS = [
  "imaging edge",
  "imagingedge",
  "obs virtual",
  "virtual camera",
  "snap camera",
  "droidcam",
  "epoccam",
  "ivcam",
  "iriun",
  "xsplit vcam",
] as const;
const LAPTOP_CAMERA_PATTERNS = [
  "integrated camera",
  "built-in",
  "facetime",
  "hd webcam",
] as const;

function normalizeCameraLabel(label: string) {
  return label.trim().toLowerCase();
}

function isConflictingCameraSource(label: string) {
  const normalized = normalizeCameraLabel(label);
  return CONFLICTING_CAMERA_PATTERNS.some(pattern => normalized.includes(pattern));
}

function isSonyUsbLivestreamSource(label: string) {
  const normalized = normalizeCameraLabel(label);
  const mentionsSony = normalized.includes("sony");
  const mentionsUsbStream =
    normalized.includes("usb") ||
    normalized.includes("uvc") ||
    normalized.includes("stream") ||
    normalized.includes("live");

  return mentionsSony && mentionsUsbStream && !isConflictingCameraSource(label);
}

function isSonyCameraSource(label: string) {
  const normalized = normalizeCameraLabel(label);
  return normalized.includes("sony") && !isConflictingCameraSource(label);
}

function scoreVideoDevice(device: MediaDeviceInfo) {
  const label = device.label || "Camera chưa cấp quyền";
  const normalized = normalizeCameraLabel(label);

  if (!label) return 0;
  if (isConflictingCameraSource(label)) return -1000;
  if (isSonyUsbLivestreamSource(label)) return 300;
  if (isSonyCameraSource(label)) return 220;
  if (normalized.includes("usb")) return 120;
  if (normalized.includes("camera")) return 60;
  if (LAPTOP_CAMERA_PATTERNS.some(pattern => normalized.includes(pattern))) return 10;
  return 30;
}

function describeVideoDevice(label: string) {
  if (isSonyUsbLivestreamSource(label)) return "Ưu tiên: Sony USB Livestream / UVC";
  if (isSonyCameraSource(label)) return "Nguồn Sony vật lý";
  if (normalizeCameraLabel(label).includes("usb")) return "Nguồn USB khả dụng";
  if (LAPTOP_CAMERA_PATTERNS.some(pattern => normalizeCameraLabel(label).includes(pattern))) {
    return "Camera tích hợp";
  }
  return "Camera khả dụng";
}

function buildVideoSourceOptions(devices: MediaDeviceInfo[]) {
  const visibleOptions: VideoSourceOption[] = devices
    .filter(device => device.kind === "videoinput")
    .filter(device => !isConflictingCameraSource(device.label))
    .map(device => {
      const score = scoreVideoDevice(device);
      return {
        deviceId: device.deviceId,
        label: device.label || "Camera chưa rõ tên",
        note: describeVideoDevice(device.label),
        score,
        recommended: score >= 300,
      };
    })
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));

  const hiddenLabels = devices
    .filter(device => device.kind === "videoinput")
    .filter(device => isConflictingCameraSource(device.label))
    .map(device => device.label || "Nguồn camera ảo");

  return { visibleOptions, hiddenLabels };
}

declare global {
  interface YouTubePlayerHandle {
    destroy?: () => void;
    playVideo?: () => void;
    pauseVideo?: () => void;
    mute?: () => void;
    unMute?: () => void;
    setVolume?: (volume: number) => void;
    loadVideoById?: (videoId: string) => void;
  }

  interface Window {
    YT?: {
      Player?: new (
        element: HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number>;
          events?: {
            onReady?: (event: { target?: YouTubePlayerHandle }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => YouTubePlayerHandle;
      PlayerState?: {
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeIframeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise<void>((resolve) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      resolve();
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!existingScript) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => resolve();
      document.head.appendChild(script);
    }
  });

  return youtubeIframeApiPromise;
}

function getYouTubeThumbnailUrl(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

const SHOWCASE_YOUTUBE_PLAYER_HOST_ID = "showcase-youtube-player-host";
const DEFAULT_MAIN_APP_URL = "http://127.0.0.1:5173";

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function resolveMainAppBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_MAIN_APP_URL?.trim();
  if (configuredBaseUrl) return ensureTrailingSlash(configuredBaseUrl);

  if (typeof document !== "undefined" && document.referrer) {
    try {
      const referrerUrl = new URL(document.referrer);
      return ensureTrailingSlash(referrerUrl.origin);
    } catch {
      // Ignore invalid referrer values and continue to local fallbacks.
    }
  }

  if (import.meta.env.DEV) {
    return ensureTrailingSlash(DEFAULT_MAIN_APP_URL);
  }

  if (typeof window !== "undefined") {
    return ensureTrailingSlash(window.location.origin);
  }

  return ensureTrailingSlash(DEFAULT_MAIN_APP_URL);
}

function buildMainAppUrl(pathname: string) {
  return new URL(pathname.replace(/^\//, ""), resolveMainAppBaseUrl()).toString();
}

const SONY_LIVE_REASONS: SonyReason[] = [
  {
    id: 1,
    title: "Image Quality",
    hook: "Chất Lượng Hình Ấn Tượng",
    benefit: "Cảm biến lớn, chi tiết rõ nét, màu sắc trung thực.",
    imageUrl: "https://placehold.co/1600x900/0f172a/93c5fd?text=Image+Quality",
    chips: ["Full-frame", "Dynamic range", "Skin tone"],
    details: [
      "Cảm biến lớn giảm noise, tăng chi tiết.",
      "Dynamic range rộng giữ trọn vùng sáng tối khi setup ánh sáng.",
      "Công nghệ xử lý màu Sony tái hiện da người tự nhiên.",
    ],
    icon: Camera,
    tone: "cool",
  },
  {
    id: 2,
    title: "Bokeh",
    hook: "Nổi Bật Nhờ Xóa Phông",
    benefit: "Ống kính khẩu lớn, chủ thể rõ, nền mờ tự nhiên.",
    imageUrl: "https://placehold.co/1600x900/1f132b/f0abfc?text=Bokeh",
    chips: ["f/1.4-f/2", "Optical blur", "Depth"],
    details: [
      "Ống kính khẩu lớn tạo phông nền mờ sâu, nổi bật chủ thể.",
      "Hiệu ứng bokeh tự nhiên hỗ trợ trải nghiệm livestream ấn tượng.",
      "Quang học thực cho chất lượng nổi bật hơn phần mềm.",
    ],
    icon: Lightbulb,
    tone: "warm",
  },
  {
    id: 3,
    title: "Eye AF",
    hook: "Lấy Nét Mắt Tự Động",
    benefit: "Tự động lấy nét mắt chính xác, duy trì hình ảnh sắc nét.",
    imageUrl: "https://placehold.co/1600x900/0f172a/67e8f9?text=Eye+AF",
    chips: ["Eye AF", "Product focus", "Stability"],
    details: [
      "Eye AF giúp tracking mắt nhanh và chính xác liên tục.",
      "Chuyển nét mượt mà giữa người và vật thể.",
      "Yên tâm cho cả bán hàng lẫn review sản phẩm trực tiếp.",
    ],
    icon: Gauge,
    tone: "cool",
  },
  {
    id: 4,
    title: "Color Control",
    hook: "Quản Lý Màu Chuyên Nghiệp",
    benefit: "Tùy chỉnh màu linh hoạt, đảm bảo đồng nhất trên mọi nền tảng.",
    imageUrl: "https://placehold.co/1600x900/0b1020/60a5fa?text=Color+Control",
    chips: ["Creative Look", "Color Lab", "Color match"],
    details: [
      "Creative Look giúp thiết lập màu sắc nhanh chóng phù hợp với thương hiệu.",
      "Picture Profile hỗ trợ tinh chỉnh chuyên sâu.",
      "Dễ dàng cân chỉnh màu khi sử dụng nhiều camera Sony.",
    ],
    icon: Sliders,
    tone: "cool",
  },
  {
    id: 5,
    title: "Low Light",
    hook: "Quay Sáng Đẹp Đủ Mọi Điều Kiện",
    benefit: "Hiệu suất tốt khi ánh sáng yếu, hình ảnh sạch chi tiết.",
    imageUrl: "https://placehold.co/1600x900/2a180d/fbbf24?text=Low+Light",
    chips: ["Low light", "Clean image", "Flexible"],
    details: [
      "ISO cao giúp hình sạch, giữ chi tiết khi ánh sáng yếu.",
      "Hoạt động ổn định trong môi trường shop hoặc studio indoor.",
      "Kết hợp đèn hỗ trợ cho chất lượng livestream tối ưu.",
    ],
    icon: Zap,
    tone: "warm",
  },
  {
    id: 6,
    title: "Connectivity",
    hook: "Kết Nối Dễ Dàng",
    benefit: "HDMI và USB UVC hỗ trợ đa nền tảng, setup nhanh chóng.",
    imageUrl: "https://placehold.co/1600x900/10203a/7dd3fc?text=Connectivity",
    chips: ["Clean HDMI", "UVC", "OBS/vMix"],
    details: [
      "Hỗ trợ xuất HDMI sạch cho capture card chuyên dụng.",
      "Kết nối USB UVC, không cần driver, cắm là dùng được.",
      "Tương thích tốt với OBS, TikTok Live Studio, vMix.",
    ],
    icon: Cable,
    tone: "cool",
  },
  {
    id: 7,
    title: "Audio",
    hook: "Âm Thanh Chuẩn Xác",
    benefit: "Kết nối digital, âm thanh rõ, đồng bộ hình tiếng.",
    imageUrl: "https://placehold.co/1600x900/0b1326/93c5fd?text=Audio",
    chips: ["MI Shoe", "Low noise", "A/V sync"],
    details: [
      "Mic Sony ECM truyền âm thanh digital trực tiếp, giảm nhiễu.",
      "Không phụ thuộc jack 3.5mm, âm thanh ổn định.",
      "Đồng bộ audio-video chính xác, không lệch khung hình.",
    ],
    icon: Mic,
    tone: "cool",
  },
  {
    id: 8,
    title: "Ecosystem",
    hook: "Hệ Sinh Thái Đa Năng",
    benefit: "Dễ dàng nâng cấp body, thay đổi lens theo nhu cầu.",
    imageUrl: "https://placehold.co/1600x900/0b1a33/c4b5fd?text=Ecosystem",
    chips: ["ZV-E10→A7", "Lens swap", "Multi-use"],
    details: [
      "Chuyển đổi body linh hoạt: ZV-E10, ZV-E1, A7 series.",
      "Đáp ứng linh hoạt mọi nhu cầu: livestream, video, chụp ảnh.",
      "Lens đa dạng: góc rộng, xóa phông, macro...",
    ],
    icon: Settings,
    tone: "cool",
  },
  {
    id: 9,
    title: "Trust Boost",
    hook: "Hình Ảnh Tạo Niềm Tin",
    benefit: "Hình ảnh sắc nét, giữ chân khách hàng hiệu quả.",
    imageUrl: "https://placehold.co/1600x900/1a1024/f9a8d4?text=Trust+Boost",
    chips: ["Retention", "Trust", "Conversion"],
    details: [
      "Tạo ấn tượng chuyên nghiệp, nâng cao uy tín thương hiệu.",
      "Chất lượng hình ảnh giúp tăng thời gian theo dõi livestream.",
      "Tối ưu cho cá nhân, doanh nghiệp, bán hàng trực tuyến.",
    ],
    icon: Star,
    tone: "warm",
  },
  {
    id: 10,
    title: "Tận Hưởng Sự Khác Biệt",
    hook: "Trải Nghiệm Sony, Cảm Nhận Đẳng Cấp",
    benefit: "Hình ảnh và chất lượng vượt trội, khác biệt mọi thiết bị di động.",
    imageUrl: "https://placehold.co/1600x900/2a1b0a/fcd34d?text=Sony+Difference",
    chips: ["Cảm biến lớn", "Chất lượng vượt trội", "Nâng chuẩn livestream"],
    details: [
      "Cảm biến lớn, công nghệ mới dẫn đầu chất lượng hình ảnh.",
      "Trải nghiệm livestream vượt trội so với thiết bị di động thông thường.",
      "Nâng tầm hình ảnh cá nhân, doanh nghiệp ngay tại showroom.",
    ],
    icon: TriangleAlert,
    tone: "warning",
  },
  {
    id: 11,
    title: "Tutorial 01",
    hook: "Bật Product Showcase Trên Sony ZV",
    benefit: "Video hướng dẫn thực hành cách chuyển nhanh chế độ Product Showcase.",
    imageUrl: getYouTubeThumbnailUrl("xlatYBYoGSA"),
    youtubeVideoId: "xlatYBYoGSA",
    chips: ["YouTube Video", "Product Showcase", "Sony ZV"],
    details: [
      "Giải thích khi nào nên dùng Product Showcase trong livestream bán hàng.",
      "Các bước thao tác trực tiếp trên thân máy để bật/tắt nhanh.",
      "Tối ưu lấy nét sản phẩm khi đưa vật thể lên gần camera.",
    ],
    icon: Camera,
    tone: "cool",
  },
  {
    id: 12,
    title: "Tutorial 02",
    hook: "Cài Đặt Soft Skin Trên Máy Sony ZV",
    benefit: "Video cài đặt Soft Skin để làm mịn da tự nhiên khi livestream.",
    imageUrl: getYouTubeThumbnailUrl("CDJcWg5JYww"),
    youtubeVideoId: "CDJcWg5JYww",
    chips: ["YouTube Video", "Soft Skin", "Beauty Setup"],
    details: [
      "Thiết lập mức Soft Skin phù hợp từng điều kiện ánh sáng khác nhau.",
      "Giữ độ chi tiết chủ thể và hạn chế cảm giác xử lý quá tay.",
      "Kết hợp profile màu để da lên đều khi livestream dài phiên.",
    ],
    icon: Lightbulb,
    tone: "warm",
  },
  {
    id: 13,
    title: "Tutorial 03",
    hook: "Combo Lens Và Phụ Kiện Cho Livestream Thời Trang",
    benefit: "Video gợi ý setup lens và phụ kiện tối ưu cho ngành thời trang.",
    imageUrl: getYouTubeThumbnailUrl("f1cIbqmgQOg"),
    youtubeVideoId: "f1cIbqmgQOg",
    chips: ["YouTube Video", "Lens Combo", "Fashion Live"],
    details: [
      "Đề xuất tiêu cự và góc máy giúp tôn chất liệu, màu sắc sản phẩm.",
      "Gợi ý phụ kiện giữ khung hình ổn định trong nhiều format live khác nhau.",
      "Thiết lập nhanh để chuyển giữa talking-head và showcase sản phẩm.",
    ],
    icon: Sliders,
    tone: "cool",
  },
  {
    id: 14,
    title: "Tutorial 04",
    hook: "Combo Lens Và Phụ Kiện Cho F&B Và Mỹ Phẩm",
    benefit: "Video hướng dẫn setup dành cho bối cảnh quay cận món ăn và mỹ phẩm.",
    imageUrl: getYouTubeThumbnailUrl("1r6Tgcytqpk"),
    youtubeVideoId: "1r6Tgcytqpk",
    chips: ["YouTube Video", "F&B", "Cosmetic Live"],
    details: [
      "Tinh chỉnh khung và ánh sáng để texture món ăn/mỹ phẩm nổi bật.",
      "Kết hợp lens phù hợp để quay close-up vẫn giữ nét ổn định.",
      "Giảm rung và giữ chất lượng hình ảnh nhất quán trong suốt buổi live.",
    ],
    icon: Mic,
    tone: "warm",
  },
  {
    id: 15,
    title: "Tutorial 05",
    hook: "Setup Sony Đơn Giản Để Livestream Chuyên Nghiệp",
    benefit: "Video tổng hợp quy trình setup nhanh cho phiên livestream tiêu chuẩn.",
    imageUrl: getYouTubeThumbnailUrl("U2OoMn2H1Pk"),
    youtubeVideoId: "U2OoMn2H1Pk",
    chips: ["YouTube Video", "Quick Setup", "Pro Livestream"],
    details: [
      "Checklist toàn bộ bước chuẩn bị trước khi lên sóng.",
      "Thiết lập camera, audio và ánh sáng theo flow dễ triển khai.",
      "Giúp đội vận hành rút ngắn thời gian setup tại showroom.",
    ],
    icon: Settings,
    tone: "warning",
  },
];

// ─── Sony Reasons Infographic Panel ───────────────────────────────────────────
function SonyLiveReasonsPanel({ onVideoFocusChange }: { onVideoFocusChange?: (isVideoMode: boolean) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [youtubePlayerHost, setYoutubePlayerHost] = useState<HTMLDivElement | null>(null);
  const youtubePlayerRef = useRef<YouTubePlayerHandle | null>(null);
  const firstYoutubeVideoId = useRef(
    SONY_LIVE_REASONS.find((reason) => reason.youtubeVideoId)?.youtubeVideoId ?? null,
  ).current;
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [hasUnlockedAudio, setHasUnlockedAudio] = useState(false);
  const reduceMotion = useReducedMotion();
  const AUTO_PLAY_MS = 15000;

  const toneStyles: Record<
    SonyReason["tone"],
    { surface: string; badge: string; chip: string; dot: string; glow: string; hoverShadow: string }
  > = {
    cool: {
      surface:
        "border-cyan-300/15 bg-[linear-gradient(145deg,rgba(34,211,238,0.2)_0%,rgba(10,14,21,0.94)_35%,rgba(7,10,15,0.98)_100%)]",
      badge: "bg-cyan-400/25 text-cyan-100",
      chip: "bg-cyan-400/20 text-cyan-100",
      dot: "bg-cyan-300",
      glow: "from-cyan-400/28 via-cyan-300/8 to-transparent",
      hoverShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(34,211,238,0.35)",
    },
    warm: {
      surface:
        "border-fuchsia-300/15 bg-[linear-gradient(145deg,rgba(250,204,21,0.22)_0%,rgba(244,114,182,0.1)_34%,rgba(10,11,17,0.98)_100%)]",
      badge: "bg-fuchsia-400/25 text-fuchsia-100",
      chip: "bg-fuchsia-400/22 text-fuchsia-100",
      dot: "bg-fuchsia-300",
      glow: "from-fuchsia-400/26 via-amber-300/10 to-transparent",
      hoverShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(244,114,182,0.35)",
    },
    warning: {
      surface:
        "border-amber-300/20 bg-[linear-gradient(145deg,rgba(245,158,11,0.3)_0%,rgba(217,119,6,0.14)_38%,rgba(16,11,5,0.98)_100%)]",
      badge: "bg-amber-400/25 text-amber-100",
      chip: "bg-amber-400/22 text-amber-100",
      dot: "bg-amber-300",
      glow: "from-amber-400/30 via-orange-400/14 to-transparent",
      hoverShadow: "0 20px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(245,158,11,0.4)",
    },
  };

  const currentReason = SONY_LIVE_REASONS[activeIndex];
  const hasYouTubeVideo = Boolean(currentReason.youtubeVideoId);
  const currentTone = toneStyles[currentReason.tone];
  const imagePlaceholderTone: Record<SonyReason["tone"], string> = {
    cool: "from-cyan-300/28 via-sky-400/16 to-blue-500/20",
    warm: "from-fuchsia-300/25 via-amber-300/14 to-violet-500/20",
    warning: "from-amber-300/30 via-orange-400/16 to-rose-500/18",
  };

  useEffect(() => {
    onVideoFocusChange?.(hasYouTubeVideo);
  }, [hasYouTubeVideo, onVideoFocusChange]);

  useEffect(() => {
    if (hasUnlockedAudio) return;

    const unlockAudio = () => {
      setHasUnlockedAudio(true);
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true, passive: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [hasUnlockedAudio]);

  const goPrev = () => {
    setSlideDirection(-1);
    setActiveIndex((prev) => (prev - 1 + SONY_LIVE_REASONS.length) % SONY_LIVE_REASONS.length);
  };

  const goNext = () => {
    setSlideDirection(1);
    setActiveIndex((prev) => (prev + 1) % SONY_LIVE_REASONS.length);
  };

  const goTo = (index: number) => {
    setSlideDirection(index > activeIndex ? 1 : -1);
    setActiveIndex(index);
  };

  useEffect(() => {
    const preconnectTargets = [
      "https://www.youtube.com",
      "https://www.youtube-nocookie.com",
      "https://i.ytimg.com",
      "https://s.ytimg.com",
    ];
    const appendedLinks: HTMLLinkElement[] = [];

    preconnectTargets.forEach((href) => {
      if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = href;
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
      appendedLinks.push(link);
    });

    void loadYouTubeIframeApi();

    return () => {
      appendedLinks.forEach((link) => link.remove());
    };
  }, []);

  useEffect(() => {
    if (hasYouTubeVideo) return;
    const timer = window.setTimeout(() => {
      setSlideDirection(1);
      setActiveIndex((prev) => (prev + 1) % SONY_LIVE_REASONS.length);
    }, AUTO_PLAY_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, hasYouTubeVideo]);

  useEffect(() => {
    if (!youtubePlayerHost || !firstYoutubeVideoId) return;

    let isCancelled = false;

    const mountYouTubePlayer = async () => {
      await loadYouTubeIframeApi();
      if (isCancelled || !youtubePlayerHost || !window.YT?.Player) return;

      youtubePlayerRef.current?.destroy?.();
      youtubePlayerRef.current = null;
      setIsPlayerReady(false);

      youtubePlayerRef.current = new window.YT.Player(youtubePlayerHost, {
        videoId: firstYoutubeVideoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          mute: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 1,
        },
        events: {
          onReady: (event) => {
            if (isCancelled) return;
            setIsPlayerReady(true);
            event.target?.mute?.();
            event.target?.setVolume?.(100);
          },
          onStateChange: (event) => {
            if (window.YT?.PlayerState && event.data === window.YT.PlayerState.ENDED) {
              setSlideDirection(1);
              setActiveIndex((prev) => (prev + 1) % SONY_LIVE_REASONS.length);
            }
          },
        },
      });
    };

    void mountYouTubePlayer();

    return () => {
      isCancelled = true;
      youtubePlayerRef.current?.destroy?.();
      youtubePlayerRef.current = null;
      setIsPlayerReady(false);
    };
  }, [firstYoutubeVideoId, youtubePlayerHost]);

  useEffect(() => {
    if (!isPlayerReady || !youtubePlayerRef.current) return;

    if (!hasYouTubeVideo || !currentReason.youtubeVideoId) {
      youtubePlayerRef.current.pauseVideo?.();
      return;
    }

    youtubePlayerRef.current.loadVideoById?.(currentReason.youtubeVideoId);
    youtubePlayerRef.current.setVolume?.(100);
    if (hasUnlockedAudio) {
      youtubePlayerRef.current.unMute?.();
    } else {
      youtubePlayerRef.current.mute?.();
    }
    youtubePlayerRef.current.playVideo?.();

    const retryTimer = window.setTimeout(() => {
      youtubePlayerRef.current?.setVolume?.(100);
      if (hasUnlockedAudio) {
        youtubePlayerRef.current?.unMute?.();
      } else {
        youtubePlayerRef.current?.mute?.();
      }
      youtubePlayerRef.current?.playVideo?.();
    }, 260);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [hasUnlockedAudio, isPlayerReady, hasYouTubeVideo, currentReason.youtubeVideoId]);

  return (
    <SlideIn from="left" delay={0.28} className="flex w-full max-w-[1040px] flex-col">
      <div className="space-y-3">
        <AnimatePresence mode="wait" initial={false}>
            <motion.article
            key={hasYouTubeVideo ? "youtube-carousel-panel" : currentReason.id}
            initial={reduceMotion || hasYouTubeVideo ? { opacity: 0 } : { opacity: 0, x: slideDirection * 56, scale: 0.98 }}
            animate={reduceMotion || hasYouTubeVideo ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion || hasYouTubeVideo ? { opacity: 0 } : { opacity: 0, x: slideDirection * -56, scale: 0.98 }}
            transition={reduceMotion || hasYouTubeVideo ? { duration: 0.12 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className={`group relative overflow-visible rounded-[24px] border p-4 md:p-5 ${currentTone.surface}`}
            whileHover={
              reduceMotion || hasYouTubeVideo
                ? undefined
                : {
                    y: -4,
                    scale: 1.01,
                    boxShadow: currentTone.hoverShadow,
                  }
            }
          >
            {!hasYouTubeVideo && (
              <div
                className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${currentTone.glow} opacity-70 blur-2xl transition-opacity duration-200 group-hover:opacity-100`}
              />
            )}

            <div className="flex flex-col gap-4 p-1">
              <div className={`relative mx-auto w-full max-w-[860px] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br ${imagePlaceholderTone[currentReason.tone]} aspect-video`}>
                <div
                  className={`absolute inset-0 bg-black transition-opacity duration-200 ${
                    hasYouTubeVideo ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                  style={{ transform: "translateZ(0)" }}
                >
                  <div
                    id={SHOWCASE_YOUTUBE_PLAYER_HOST_ID}
                    ref={setYoutubePlayerHost}
                    className="h-full w-full"
                  />
                </div>
                <img
                  src={currentReason.imageUrl}
                  alt={currentReason.hook}
                  className={`h-full w-full object-cover transition-opacity duration-200 ${
                    hasYouTubeVideo ? "pointer-events-none opacity-0" : "opacity-100"
                  }`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(event: SyntheticEvent<HTMLImageElement>) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
                {!hasYouTubeVideo && (
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_22%,rgba(255,255,255,0.2),transparent_54%)]" />
                )}
                {!hasYouTubeVideo && (
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),transparent_42%,rgba(0,0,0,0.22))]" />
                )}
                <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/20 bg-black/35 px-2 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                  {String(activeIndex + 1).padStart(2, "0")} · {currentReason.title}
                </div>
              </div>

                <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{currentReason.title}</p>
                <h3 className="mt-1 text-[20px] font-black leading-[1.12] text-balance text-white sm:text-[24px] xl:text-[28px]">
                  {currentReason.hook}
                </h3>
                <p className="mt-1 text-[15px] leading-[1.45] text-pretty text-neutral-200 sm:text-[16px]">
                  {currentReason.benefit}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {currentReason.chips.map((chip, chipIndex) => (
                    <motion.span
                      key={chip}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${currentTone.chip}`}
                      animate={reduceMotion || hasYouTubeVideo ? undefined : { scale: [1, 1.03, 1] }}
                      transition={
                        reduceMotion || hasYouTubeVideo
                          ? undefined
                          : { duration: 1.4, repeat: Infinity, repeatDelay: 0.8, delay: chipIndex * 0.15 }
                      }
                    >
                      {chip}
                    </motion.span>
                  ))}
                </div>

                <ul className="mt-3 space-y-1.5 text-[14px] leading-[1.5] text-pretty text-neutral-200 sm:text-[15px]">
                  {currentReason.details.map((detail) => (
                    <li key={detail} className="flex items-start gap-2">
                      <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${currentTone.dot}`} />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              </div>
            </motion.article>
          </AnimatePresence>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 transition hover:bg-white/[0.16] hover:text-white"
              aria-label="Previous reason"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/80 transition hover:bg-white/[0.16] hover:text-white"
              aria-label="Next reason"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold tracking-[0.18em] text-neutral-400">
              {String(activeIndex + 1).padStart(2, "0")}/{String(SONY_LIVE_REASONS.length).padStart(2, "0")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {SONY_LIVE_REASONS.map((reason, index) => (
              <button
                key={reason.id}
                type="button"
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? "w-8 bg-white" : "w-3 bg-white/25 hover:bg-white/45"
                }`}
                aria-label={`Go to reason ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </SlideIn>
  );
}

// ─── Phone Mockup ──────────────────────────────────────────────────────────────
function PhoneMockup({ performanceMode = "normal" }: { performanceMode?: "normal" | "video" }) {
  const commentIndexRef = useRef<number>(3);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [gifts, setGifts] = useState<GiftParticle[]>([]);
  const [compliments, setCompliments] = useState<ComplimentBubble[]>([]);
  const [feedComments, setFeedComments] = useState<FeedComment[]>(
    () => COMMENT_POOL.slice(0, 3).map((c, i) => ({ ...c, id: i }))
  );
  const [viewerCount, setViewerCount] = useState(1847);
  const [followCount, setFollowCount] = useState(12840);
  const [likeCount, setLikeCount] = useState(42384);
  const [giftCount, setGiftCount] = useState(1862);
  const [cameraState, setCameraState] = useState<"idle" | "loading" | "live" | "fallback">("idle");
  const [cameraLabel, setCameraLabel] = useState("Chưa chọn source");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoSources, setVideoSources] = useState<VideoSourceOption[]>([]);
  const [hiddenSourceLabels, setHiddenSourceLabels] = useState<string[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(true);
  const [isRefreshingSources, setIsRefreshingSources] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [sourceRotation, setSourceRotation] = useState<number>(90);
  const [frameRotate90, setFrameRotate90] = useState(false);
  const isVideoPerformanceMode = performanceMode === "video";

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);

  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const attachStream = useCallback(async (stream: MediaStream, label?: string) => {
    const videoEl = videoRef.current;
    streamRef.current = stream;
    setCameraLabel(label || stream.getVideoTracks()[0]?.label || "USB Camera");

    if (videoEl) {
      videoEl.srcObject = stream;
      try {
        await videoEl.play();
      } catch {
        // Ignore autoplay race in case browser delays playback briefly.
      }
    }

    setCameraState("live");
  }, []);

  const refreshVideoSources = useCallback(async (requestPermission = false) => {
    if (!navigator.mediaDevices?.enumerateDevices || !navigator.mediaDevices?.getUserMedia) {
      const message = "Trình duyệt không hỗ trợ camera API.";
      setVideoSources([]);
      setHiddenSourceLabels([]);
      setPickerError(message);
      setCameraError(message);
      setCameraState("fallback");
      return [];
    }

    setIsRefreshingSources(true);
    setPickerError(null);

    try {
      if (requestPermission) {
        const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        permissionStream.getTracks().forEach(track => track.stop());
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const { visibleOptions, hiddenLabels } = buildVideoSourceOptions(devices);

      setVideoSources(visibleOptions);
      setHiddenSourceLabels(hiddenLabels);

      if (!visibleOptions.length) {
        const message = "Không tìm thấy Sony USB Livestream hoặc camera USB khả dụng. Hãy bật USB Streaming trên máy ảnh rồi quét lại.";
        setSelectedDeviceId(null);
        setPickerError(message);
        setCameraError(message);
        setCameraState("fallback");
        return [];
      }

      const currentDeviceId = selectedDeviceIdRef.current;
      const nextDeviceId =
        currentDeviceId && visibleOptions.some(option => option.deviceId === currentDeviceId)
          ? currentDeviceId
          : visibleOptions[0].deviceId;

      if (currentDeviceId && nextDeviceId !== currentDeviceId && streamRef.current) {
        stopCurrentStream();
        setCameraState("fallback");
        setCameraError("Source trước đó đã đổi hoặc bị ngắt. Hãy chọn lại source camera.");
        setIsPickerOpen(true);
      }

      setSelectedDeviceId(nextDeviceId);
      return visibleOptions;
    } catch (error) {
      const message =
        error instanceof DOMException
          ? error.message
          : error instanceof Error
            ? error.message
            : "Không thể quét danh sách camera.";
      setVideoSources([]);
      setHiddenSourceLabels([]);
      setSelectedDeviceId(null);
      setPickerError(message);
      setCameraError(message);
      setCameraState("fallback");
      return [];
    } finally {
      setIsRefreshingSources(false);
    }
  }, [stopCurrentStream]);

  const connectSelectedCamera = useCallback(async () => {
    if (!selectedDeviceId || !navigator.mediaDevices?.getUserMedia) {
      setPickerError("Chưa có source nào được chọn.");
      return;
    }

    setCameraState("loading");
    setCameraError(null);
    setPickerError(null);

    try {
      stopCurrentStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...CAMERA_BASE_CONSTRAINTS,
          deviceId: { exact: selectedDeviceId },
        },
        audio: false,
      });

      const selectedSource = videoSources.find(option => option.deviceId === selectedDeviceId);
      await attachStream(stream, stream.getVideoTracks()[0]?.label || selectedSource?.label);
      setIsPickerOpen(false);
    } catch (error) {
      const message =
        error instanceof DOMException
          ? error.message
          : error instanceof Error
            ? error.message
            : "Không thể mở source camera đã chọn.";
      setCameraState("fallback");
      setCameraError(message);
      setPickerError(message);
      setIsPickerOpen(true);
    }
  }, [attachStream, selectedDeviceId, stopCurrentStream, videoSources]);

  const spawnHeart = useCallback(() => {
    const id = Date.now() * 100 + Math.floor(Math.random() * 100);
    const heart: HeartParticle = {
      id,
      rightPct: 4 + Math.floor(Math.random() * 20),
      size: 14 + Math.floor(Math.random() * 18),
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      targetY: -(140 + Math.floor(Math.random() * 110)),
      targetX: Math.floor((Math.random() - 0.5) * 50),
      duration: 1.8 + Math.random() * 0.7,
    };
    setHearts(prev => [...prev, heart]);
    setTimeout(() => setHearts(prev => prev.filter(h => h.id !== id)), 2800);
  }, []);

  const spawnGift = useCallback(() => {
    const id = Date.now() * 100 + Math.floor(Math.random() * 100);
    const gift: GiftParticle = {
      id,
      rightPct: 8 + Math.floor(Math.random() * 18),
      emoji: GIFT_EMOJIS[Math.floor(Math.random() * GIFT_EMOJIS.length)],
      targetY: -(180 + Math.floor(Math.random() * 140)),
      targetX: Math.floor((Math.random() - 0.5) * 40),
      duration: 2 + Math.random() * 0.8,
      scale: 0.9 + Math.random() * 0.5,
    };
    setGifts(prev => [...prev, gift]);
    setTimeout(() => setGifts(prev => prev.filter(g => g.id !== id)), 3200);
  }, []);

  // Auto-spawn hearts
  useEffect(() => {
    if (isVideoPerformanceMode) return;
    const t = setInterval(spawnHeart, 430);
    return () => clearInterval(t);
  }, [isVideoPerformanceMode, spawnHeart]);

  // Spawn compliment bubbles
  useEffect(() => {
    if (isVideoPerformanceMode) return;
    const t = setInterval(() => {
      const id = Date.now() * 100 + Math.floor(Math.random() * 100);
      const text = COMPLIMENT_TEXTS[Math.floor(Math.random() * COMPLIMENT_TEXTS.length)];
      const leftPct = 4 + Math.floor(Math.random() * 38);
      setCompliments(prev => [...prev, { id, text, leftPct }]);
      setTimeout(() => setCompliments(prev => prev.filter(c => c.id !== id)), 2900);
    }, 2100);
    return () => clearInterval(t);
  }, [isVideoPerformanceMode]);

  // Viewer count drift up
  useEffect(() => {
    if (isVideoPerformanceMode) return;
    const t = setInterval(() => {
      setViewerCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 2700);
    return () => clearInterval(t);
  }, [isVideoPerformanceMode]);

  // Follow count drift up
  useEffect(() => {
    if (isVideoPerformanceMode) return;
    const t = setInterval(() => {
      setFollowCount(prev => prev + Math.floor(Math.random() * 7) + 2);
    }, 2300);
    return () => clearInterval(t);
  }, [isVideoPerformanceMode]);

  // Like count drift up
  useEffect(() => {
    if (isVideoPerformanceMode) return;
    const t = setInterval(() => {
      setLikeCount(prev => prev + Math.floor(Math.random() * 9) + 3);
    }, 1100);
    return () => clearInterval(t);
  }, [isVideoPerformanceMode]);

  // Gift stream + count drift up
  useEffect(() => {
    if (isVideoPerformanceMode) return;
    const t = setInterval(() => {
      spawnGift();
      setGiftCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 1400);
    return () => clearInterval(t);
  }, [isVideoPerformanceMode, spawnGift]);

  // Rotating chat comments praising Sony image quality
  useEffect(() => {
    if (isVideoPerformanceMode) return;
    const t = setInterval(() => {
      const idx = commentIndexRef.current;
      commentIndexRef.current = idx + 1;
      const next = COMMENT_POOL[idx % COMMENT_POOL.length];
      const id = Date.now() * 100 + Math.floor(Math.random() * 100);
      setFeedComments(prev => [...prev, { ...next, id }].slice(-4));
    }, 1800);
    return () => clearInterval(t);
  }, [isVideoPerformanceMode]);

  useEffect(() => {
    if (!isVideoPerformanceMode) return;
    setHearts([]);
    setGifts([]);
    setCompliments([]);
    setFeedComments(prev => prev.slice(-2));
  }, [isVideoPerformanceMode]);

  // Hidden control panel toggle (Ctrl/Cmd only)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Control" || event.key === "Meta") && !event.repeat) {
        setShowControlPanel(prev => !prev);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    void refreshVideoSources(true);
    setIsPickerOpen(true);

    return () => {
      stopCurrentStream();
    };
  }, [refreshVideoSources, stopCurrentStream]);

  useEffect(() => {
    if (!navigator.mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      void refreshVideoSources(false);
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
  }, [refreshVideoSources]);

  const fmt = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
  const sourceTransform = `translate(-50%, -50%) rotate(${sourceRotation}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`;
  const frameTransform = frameRotate90 ? "rotate(90deg) scale(1.78)" : "none";
  const cameraBadgeText =
    cameraState === "live"
      ? `${cameraLabel} ● LIVE`
      : cameraState === "loading"
        ? "ĐANG KẾT NỐI CAMERA..."
        : cameraState === "idle"
          ? "CHỌN SOURCE CAMERA"
          : "KHÔNG CÓ TÍN HIỆU CAMERA";

  return (
    <motion.div
      className="relative flex-shrink-0 origin-top"
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring.smooth, delay: 0.2 }}
    >
      {/* ── Phone shell ── */}
      <div className="relative h-[834px] w-[392px]">
        <AnimatePresence>
          {isPickerOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[140] flex items-start justify-center rounded-[38px] bg-black/72 px-5 pb-5 pt-[64px] backdrop-blur-md"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className="max-h-full w-full overflow-y-auto rounded-[28px] border border-white/15 bg-[#07090d]/95 p-4 shadow-[0_28px_80px_rgba(0,0,0,0.65)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                      Video Source Picker
                    </p>
                    <h3 className="mt-1 text-[22px] font-black leading-tight text-white">
                      Chọn camera cho Showcase
                    </h3>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/65">
                      Mỗi lần truy cập Showcase sẽ hiện hộp chọn này. App đang ưu tiên Sony USB Livestream
                      và tự ẩn các source ảo dễ gây nhầm.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshVideoSources(true)}
                    disabled={isRefreshingSources}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] hover:text-white disabled:cursor-wait disabled:opacity-50"
                    aria-label="Quét lại source camera"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshingSources ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="mt-4 space-y-2.5">
                  {videoSources.map(source => {
                    const active = selectedDeviceId === source.deviceId;

                    return (
                      <label
                        key={source.deviceId}
                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                          active
                            ? "border-cyan-300/40 bg-cyan-400/10 shadow-[0_0_0_1px_rgba(103,232,249,0.2)]"
                            : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="video-source"
                          className="mt-1 h-4 w-4 accent-cyan-400"
                          checked={active}
                          onChange={() => setSelectedDeviceId(source.deviceId)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[12px] font-semibold text-white">{source.label}</p>
                            {source.recommended && (
                              <span className="rounded-full border border-cyan-300/25 bg-cyan-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-200">
                                Recommended
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[10px] text-white/55">{source.note}</p>
                        </div>
                      </label>
                    );
                  })}

                  {!videoSources.length && !isRefreshingSources && (
                    <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-3 text-[11px] leading-relaxed text-amber-100/90">
                      Không có source khả dụng. Bật chế độ USB Livestream trên máy ảnh Sony rồi bấm quét lại.
                    </div>
                  )}
                </div>

                {!!hiddenSourceLabels.length && (
                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
                      Hidden Sources
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-white/55">
                      Đã ẩn {hiddenSourceLabels.length} source ảo/xung đột để tránh chọn nhầm:
                      {" "}
                      {hiddenSourceLabels.join(", ")}.
                    </p>
                  </div>
                )}

                {pickerError && (
                  <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-3 py-2.5">
                    <p className="text-[10px] leading-relaxed text-amber-100/90">{pickerError}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshVideoSources(true)}
                    disabled={isRefreshingSources}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-[11px] font-semibold text-white/85 transition hover:bg-white/[0.1] disabled:cursor-wait disabled:opacity-50"
                  >
                    Cấp quyền & quét lại
                  </button>
                  <button
                    type="button"
                    onClick={() => void connectSelectedCamera()}
                    disabled={!selectedDeviceId || isRefreshingSources}
                    className="inline-flex flex-[1.2] items-center justify-center rounded-2xl bg-cyan-300 px-3 py-2.5 text-[11px] font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/35"
                  >
                    Dùng source đã chọn
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showControlPanel && (
            <motion.div
              initial={{ opacity: 0, x: -320, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -280, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="fixed left-4 top-1/2 z-[120] w-[260px] -translate-y-1/2 rounded-2xl border border-white/20 bg-black/80 p-3 backdrop-blur-md"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300">Preview Control</p>
              <p className="mt-1 text-[10px] text-white/55">Toggle panel: Ctrl / Cmd</p>
              <p className="mt-1 text-[10px] text-white/70">Active source: {cameraLabel}</p>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-400/10 px-2 py-1.5 text-[10px] font-semibold text-cyan-100 transition hover:bg-cyan-400/15"
              >
                Mở lại source picker
              </button>

              <div className="mt-3 space-y-2.5">
                <label className="block">
                  <span className="text-[10px] font-semibold text-white/75">Rotate source</span>
                  <select
                    value={String(sourceRotation)}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setSourceRotation(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-[#0e1118] px-2 py-1.5 text-[11px] text-white outline-none"
                  >
                    <option value="0">0°</option>
                    <option value="90">90°</option>
                    <option value="180">180°</option>
                    <option value="270">270°</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0e1118] px-2 py-1.5 text-[10px] text-white/90">
                    <input type="checkbox" checked={flipHorizontal} onChange={(e: ChangeEvent<HTMLInputElement>) => setFlipHorizontal(e.target.checked)} />
                    Flip H
                  </label>
                  <label className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#0e1118] px-2 py-1.5 text-[10px] text-white/90">
                    <input type="checkbox" checked={flipVertical} onChange={(e: ChangeEvent<HTMLInputElement>) => setFlipVertical(e.target.checked)} />
                    Flip V
                  </label>
                </div>

                <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0e1118] px-2 py-1.5 text-[10px] text-white/90">
                  <input type="checkbox" checked={frameRotate90} onChange={(e: ChangeEvent<HTMLInputElement>) => setFrameRotate90(e.target.checked)} />
                  Rotate frame 90°
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute -inset-7 rounded-[48px] bg-[radial-gradient(circle_at_14%_24%,rgba(164,204,255,0.24),rgba(120,150,196,0.1)_30%,transparent_66%)] blur-2xl" />
        <div className="pointer-events-none absolute -inset-7 rounded-[48px] bg-[radial-gradient(circle_at_88%_78%,rgba(142,234,255,0.2),rgba(91,141,168,0.08)_30%,transparent_68%)] blur-2xl" />
        <div className="pointer-events-none absolute -inset-[1px] rounded-[38px] border border-white/16 shadow-[0_0_0_1px_rgba(173,207,255,0.2),0_0_24px_rgba(115,174,255,0.18),0_0_56px_rgba(109,212,255,0.1)]" />
        <div className="pointer-events-none absolute inset-[1px] rounded-[36px] border border-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(255,255,255,0.03)]" />
        <motion.div
          className="pointer-events-none absolute -left-8 -right-8 top-1 z-10 h-11 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18),rgba(255,255,255,0.02)_55%,transparent_72%)] blur-md"
          animate={isVideoPerformanceMode ? undefined : { opacity: [0.32, 0.55, 0.32] }}
          transition={isVideoPerformanceMode ? undefined : { duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          style={isVideoPerformanceMode ? { opacity: 0.24 } : undefined}
        />

        <div className="relative h-full w-full overflow-hidden rounded-[36px] border-[7px] border-[#07080b] bg-[linear-gradient(180deg,#0c0f14_0%,#08090c_100%)] shadow-[0_34px_120px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="pointer-events-none absolute inset-[3px] rounded-[30px] border border-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(255,255,255,0.03)]" />
        {/* Hardware details */}
        <div className="pointer-events-none absolute left-1/2 top-[12px] z-40 flex h-[18px] w-[108px] -translate-x-1/2 items-center justify-center">
          <div className="h-[2.5px] w-[72px] rounded-full bg-neutral-700/75" />
          <div className="ml-3 h-[7px] w-[7px] rounded-full border border-neutral-600/60 bg-neutral-900" />
        </div>
        <div className="pointer-events-none absolute left-[2px] top-36 z-40 h-20 w-[2px] rounded-full bg-neutral-500/25" />
        <div className="pointer-events-none absolute right-[1px] top-36 z-40 h-10 w-[3px] rounded-l-full bg-neutral-400/35" />
        <div className="pointer-events-none absolute right-[1px] top-[198px] z-40 h-24 w-[3px] rounded-l-full bg-neutral-400/35" />
        <div className="pointer-events-none absolute right-[1px] top-[336px] z-40 h-14 w-[4px] rounded-l-full bg-neutral-400/40" />

        {/* ── Camera feed ── */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{ transform: frameTransform, transformOrigin: "center center" }}>
            <video
              ref={videoRef}
              className={`absolute left-1/2 top-1/2 h-full w-auto min-w-full max-w-none object-cover transition-opacity duration-300 ${
                cameraState === "live" ? "opacity-100" : "opacity-0"
              }`}
              style={{ transform: sourceTransform }}
              autoPlay
              muted
              playsInline
            />
          </div>

          {/* Gradient fallback */}
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              cameraState === "live" ? "opacity-0" : "opacity-100"
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-amber-950 via-stone-950 to-slate-950" />
            <div className="absolute -top-12 right-0 h-64 w-64 rounded-full bg-orange-700/30 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-56 w-full bg-gradient-to-t from-blue-950/60 to-transparent" />
          </div>

          {/* Enhanced bokeh particles */}
          {!isVideoPerformanceMode && ([
            { w:100, h:100, l:'10%', t:'15%', c:'#fbbf24', dur:4.5 },
            { w:70,  h:70,  l:'55%', t:'8%',  c:'#f97316', dur:5.5 },
            { w:120, h:120, l:'2%',  t:'35%', c:'#fcd34d', dur:6.5 },
            { w:80,  h:80,  l:'65%', t:'28%', c:'#fb923c', dur:5.0 },
            { w:60,  h:60,  l:'35%', t:'48%', c:'#fef08a', dur:5.8 },
            { w:110, h:110, l:'18%', t:'58%', c:'#fed7aa', dur:4.0 },
            { w:50,  h:50,  l:'72%', t:'50%', c:'#fda4af', dur:5.2 },
          ] as const).map((b, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full blur-2xl"
              style={{ width:b.w, height:b.h, left:b.l, top:b.t, background:b.c, opacity:0.15 }}
              animate={{ x:[0,10,-6,0], y:[0,-8,5,0], opacity:[0.12,0.25,0.12] }}
              transition={{ duration:b.dur, repeat:Infinity, ease:'easeInOut' }}
            />
          ))}

          {cameraError && (
            <div className="pointer-events-none absolute left-4 right-4 top-[66px] rounded-xl border border-amber-300/20 bg-black/45 px-3 py-1.5 backdrop-blur-sm">
              <p className="line-clamp-2 text-[10px] font-medium text-amber-200/90">Camera: {cameraError}</p>
            </div>
          )}
        </div>

        {/* Bottom gradient for readability */}
        <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-40 h-1 w-28 -translate-x-1/2 rounded-full bg-white/60" />

        {/* ── TOP BAR ── */}
        <div className="absolute left-0 right-0 top-0 z-30 px-5 pt-[30px]">
          <div className="flex items-center justify-between">
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/40 bg-black shadow-lg">
                  <img
                    src="https://www.pngkey.com/png/full/7-76761_alpha-logo-sony-alpha-logo-png.png"
                    alt="Sony Vietnam avatar"
                    className="absolute inset-0 z-10 h-full w-full scale-[0.88] rounded-full object-contain object-center"
                    loading="lazy"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-black" />
              </div>
              <div>
                <div className="text-white text-[13px] font-bold leading-none drop-shadow-lg">@sony.vietnam</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <motion.div
                    className="w-2 h-2 rounded-full bg-red-500"
                    animate={isVideoPerformanceMode ? undefined : { opacity:[1,0.15,1] }}
                    transition={isVideoPerformanceMode ? undefined : { duration:0.85, repeat:Infinity }}
                    style={isVideoPerformanceMode ? { opacity: 0.9 } : undefined}
                  />
                  <span className="text-red-400 text-[10px] font-extrabold uppercase tracking-wider drop-shadow-lg">LIVE</span>
                </div>
              </div>
            </div>

            {/* Viewer + Follow metrics */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <motion.span
                  key={viewerCount}
                  className="text-white text-[11px] font-bold tabular-nums"
                  initial={{ y:-6, opacity:0 }}
                  animate={{ y:0, opacity:1 }}
                  transition={{ duration:0.2 }}
                >
                  {fmt(viewerCount)}
                </motion.span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-teal-400/30 bg-black/60 px-2.5 py-1 backdrop-blur-sm">
                <span className="text-[10px] font-bold uppercase tracking-wide text-teal-300">Follow</span>
                <motion.span
                  key={followCount}
                  className="text-[10px] font-bold tabular-nums text-teal-300"
                  initial={{ y:-5, opacity:0 }}
                  animate={{ y:0, opacity:1 }}
                  transition={{ duration:0.2 }}
                >
                  {fmt(followCount)}
                </motion.span>
              </div>
            </div>
          </div>
        </div>

        {/* ── FLOATING COMPLIMENTS ── */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          <AnimatePresence>
            {compliments.map(c => (
              <motion.div
                key={c.id}
                className="absolute"
                style={{ left:`${c.leftPct}%`, bottom:180 }}
                initial={{ y:0, opacity:0, scale:0.8 }}
                animate={{ y:-150, opacity:[0,1,1,0], scale:[0.8,1,1,0.9] }}
                exit={{ opacity:0 }}
                transition={{ duration:2.8, ease:'easeOut', times:[0,0.1,0.7,1] }}
              >
                <div className="bg-black/30 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap shadow-xl">
                  {c.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── HEART & GIFT STREAM ── */}
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
          <AnimatePresence>
            {hearts.map(heart => (
              <motion.div
                key={heart.id}
                className="absolute"
                style={{ right: `${heart.rightPct}%`, bottom: 90, color: heart.color, fontSize: heart.size }}
                initial={{ y: 0, x: 0, opacity: 0, scale: 0.8 }}
                animate={{ y: heart.targetY, x: heart.targetX, opacity: [0, 1, 1, 0], scale: [0.8, 1.1, 1] }}
                exit={{ opacity: 0 }}
                transition={{ duration: heart.duration, ease: "easeOut", times: [0, 0.2, 0.8, 1] }}
              >
                ❤
              </motion.div>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {gifts.map(gift => (
              <motion.div
                key={gift.id}
                className="absolute drop-shadow-[0_0_10px_rgba(255,255,255,0.35)]"
                style={{ right: `${gift.rightPct}%`, bottom: 110, fontSize: 20 }}
                initial={{ y: 0, x: 0, opacity: 0, scale: 0.8 }}
                animate={{ y: gift.targetY, x: gift.targetX, opacity: [0, 1, 1, 0], scale: [0.8, gift.scale, 0.9] }}
                exit={{ opacity: 0 }}
                transition={{ duration: gift.duration, ease: "easeOut", times: [0, 0.15, 0.75, 1] }}
              >
                {gift.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── LIVE COMMENTS ── */}
        <div className="absolute bottom-8 left-5 right-[84px] z-30 flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout">
            {feedComments.map(comment => (
              <motion.div
                key={comment.id}
                layout
              className="flex items-center gap-2"
              initial={{ opacity:0, x:-16, y:10 }}
              animate={{ opacity:1, x:0, y:0 }}
              exit={{ opacity:0, x:-10, scale:0.95 }}
              transition={{ duration:0.28 }}
            >
                <div className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
                  <img
                    src={comment.avatar}
                    alt={comment.user}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    onError={(e: SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="z-10 text-[9px] font-bold text-white">{comment.user[0]}</span>
                </div>
                <div className="min-w-0 max-w-[250px] rounded-2xl bg-black/30 px-3 py-1.5 backdrop-blur-sm">
                  <span className={`text-[10px] font-bold ${comment.color}`}>{comment.user}</span>
                  <span className="ml-1 text-[10px] text-white/90">{comment.text}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* ── RIGHT ACTION BUTTONS ── */}
          <div className="absolute bottom-[112px] right-3 z-30 flex flex-col items-center gap-4">
          {/* Enhanced Like */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-rose-500/40"
              whileHover={{ scale:1.2, rotate:5 }}
              whileTap={{ scale:0.8 }}
              onClick={() => {
                for (let i = 0; i < 7; i++) setTimeout(spawnHeart, i * 75);
                setLikeCount(p => p + 1);
              }}
              transition={spring.bouncy}
            >
              <span className="text-2xl">❤️</span>
            </motion.button>
            <motion.span
              key={likeCount}
              className="text-white text-[10px] font-bold tabular-nums drop-shadow-lg"
              initial={{ scale:1.8, color:'#fb7185' }}
              animate={{ scale:1, color:'#ffffff' }}
              transition={{ duration:0.25 }}
            >
              {fmt(likeCount)}
            </motion.span>
          </div>

          {/* Gift button */}
          <div className="flex flex-col items-center gap-1">
            <motion.button
              className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 shadow-2xl shadow-amber-500/30"
              whileHover={{ scale:1.15, rotate:-8 }}
              whileTap={{ scale:0.85 }}
              onClick={() => {
                for (let i = 0; i < 4; i++) setTimeout(spawnGift, i * 90);
                setGiftCount(prev => prev + 2);
              }}
              transition={spring.bouncy}
            >
              <span className="text-xl">🎁</span>
            </motion.button>
            <motion.span
              key={giftCount}
              className="text-[10px] font-bold tabular-nums text-white drop-shadow-lg"
              initial={{ scale:1.5, color:"#fcd34d" }}
              animate={{ scale:1, color:"#ffffff" }}
              transition={{ duration:0.25 }}
            >
              {fmt(giftCount)}
            </motion.span>
          </div>
        </div>

        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Showcase Page ───────────────────────────────────────────────────────
export function LivestreamShowcasePage() {
  const [isExiting, setIsExiting] = useState(false);
  const [isVideoSlideFocused, setIsVideoSlideFocused] = useState(false);
  const [mainAppSopUrl] = useState(() => buildMainAppUrl("/livestream"));
  const exitToSop = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      window.location.assign(mainAppSopUrl);
    }, 260);
  }, [mainAppSopUrl]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitToSop();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [exitToSop]);

  return (
    <AnimatePresence mode="wait">
      {!isExiting && (
        <motion.div
          className="fixed inset-0 overflow-hidden bg-[#050608] non-critical"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="absolute left-4 top-4 z-[180] sm:left-6 sm:top-6">
            <motion.button
              type="button"
              onClick={exitToSop}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/35 px-4 py-2 text-sm font-semibold text-white/90 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-white/[0.14] hover:text-white"
              whileHover={{ scale: 1.02, x: -2 }}
              whileTap={{ scale: 0.98 }}
              transition={spring.hover}
              aria-label="Back to Livestream SOP"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to SOP</span>
            </motion.button>
          </div>
          <div className="relative h-full w-full">
            <div className="mx-auto flex h-full w-full max-w-[1680px] items-center justify-center px-1 sm:px-3 lg:px-6">
              <div className="grid h-full w-full grid-cols-1 items-center gap-y-6 lg:grid-cols-[49%_51%] lg:gap-x-6 xl:gap-x-8">
                <div className="relative h-full overflow-hidden">
                  <div className="absolute left-1/2 top-0 origin-top -translate-x-1/2 translate-y-[30px] scale-[1.02] lg:left-[48%] lg:translate-y-[38px] lg:scale-[1.14]">
                    <PhoneMockup performanceMode={isVideoSlideFocused ? "video" : "normal"} />
                  </div>
                </div>
                <div className="relative h-full lg:pr-4 xl:pr-6 2xl:pr-8">
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="w-full max-w-[1020px] lg:-translate-x-[4%]">
                      <SonyLiveReasonsPanel onVideoFocusChange={setIsVideoSlideFocused} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
