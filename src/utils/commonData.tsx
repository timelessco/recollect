import { type PostgrestError } from "@supabase/supabase-js";

import ArticleIcon from "../icons/articleIcon";
import FolderIcon from "../icons/folderIcon";
import HomeIconGray from "../icons/homeIconGray";
import ImageIcon from "../icons/imageIcon";
import InboxIconGray from "../icons/inboxIconGray";
import SearchIconGray from "../icons/searchIconGray";
import SettingsIcon from "../icons/settingsIcon";
import TrashIconGray from "../icons/trashIconGray";
import VideoIcon from "../icons/videoIcon";
import { type BookmarksCountTypes } from "../types/apiTypes";

import {
	ALL_BOOKMARKS_URL,
	IMAGES_URL,
	LINKS_URL,
	menuListItemName,
	SEARCH_URL,
	SETTINGS_URL,
	TRASH_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
} from "./constants";

// TODO: check if this is needed (for code cleanup)
const object = [
	{
		name: "address-book",
	},
	{
		name: "air-traffic-control",
	},
	{
		name: "airplane",
	},
	{
		name: "airplane-in-flight",
	},
	{
		name: "airplane-landing",
	},
	{
		name: "airplane-takeoff",
	},
	{
		name: "airplane-tilt",
	},
	{
		name: "airplay",
	},
	{
		name: "alarm",
	},
	{
		name: "alien",
	},
	{
		name: "align-bottom",
	},
	{
		name: "align-bottom-simple",
	},
	{
		name: "align-center-horizontal",
	},
	{
		name: "align-center-horizontal-simple",
	},
	{
		name: "align-center-vertical",
	},
	{
		name: "align-center-vertical-simple",
	},
	{
		name: "align-left",
	},
	{
		name: "align-left-simple",
	},
	{
		name: "align-right",
	},
	{
		name: "align-right-simple",
	},
	{
		name: "align-top",
	},
	{
		name: "align-top-simple",
	},
	{
		name: "amazon-logo",
	},
	{
		name: "anchor",
	},
	{
		name: "anchor-simple",
	},
	{
		name: "android-logo",
	},
	{
		name: "angular-logo",
	},
	{
		name: "aperture",
	},
	{
		name: "app-store-logo",
	},
	{
		name: "app-window",
	},
	{
		name: "apple-logo",
	},
	{
		name: "apple-podcasts-logo",
	},
	{
		name: "archive",
	},
	{
		name: "archive-box",
	},
	{
		name: "archive-tray",
	},
	{
		name: "armchair",
	},
	{
		name: "arrow-arc-left",
	},
	{
		name: "arrow-arc-right",
	},
	{
		name: "arrow-bend-double-up-left",
	},
	{
		name: "arrow-bend-double-up-right",
	},
	{
		name: "arrow-bend-down-left",
	},
	{
		name: "arrow-bend-down-right",
	},
	{
		name: "arrow-bend-left-down",
	},
	{
		name: "arrow-bend-left-up",
	},
	{
		name: "arrow-bend-right-down",
	},
	{
		name: "arrow-bend-right-up",
	},
	{
		name: "arrow-bend-up-left",
	},
	{
		name: "arrow-bend-up-right",
	},
	{
		name: "arrow-circle-down",
	},
	{
		name: "arrow-circle-down-left",
	},
	{
		name: "arrow-circle-down-right",
	},
	{
		name: "arrow-circle-left",
	},
	{
		name: "arrow-circle-right",
	},
	{
		name: "arrow-circle-up",
	},
	{
		name: "arrow-circle-up-left",
	},
	{
		name: "arrow-circle-up-right",
	},
	{
		name: "arrow-clockwise",
	},
	{
		name: "arrow-counter-clockwise",
	},
	{
		name: "arrow-down",
	},
	{
		name: "arrow-down-left",
	},
	{
		name: "arrow-down-right",
	},
	{
		name: "arrow-elbow-down-left",
	},
	{
		name: "arrow-elbow-down-right",
	},
	{
		name: "arrow-elbow-left",
	},
	{
		name: "arrow-elbow-left-down",
	},
	{
		name: "arrow-elbow-left-up",
	},
	{
		name: "arrow-elbow-right",
	},
	{
		name: "arrow-elbow-right-down",
	},
	{
		name: "arrow-elbow-right-up",
	},
	{
		name: "arrow-elbow-up-left",
	},
	{
		name: "arrow-elbow-up-right",
	},
	{
		name: "arrow-fat-down",
	},
	{
		name: "arrow-fat-left",
	},
	{
		name: "arrow-fat-line-down",
	},
	{
		name: "arrow-fat-line-left",
	},
	{
		name: "arrow-fat-line-right",
	},
	{
		name: "arrow-fat-line-up",
	},
	{
		name: "arrow-fat-lines-down",
	},
	{
		name: "arrow-fat-lines-left",
	},
	{
		name: "arrow-fat-lines-right",
	},
	{
		name: "arrow-fat-lines-up",
	},
	{
		name: "arrow-fat-right",
	},
	{
		name: "arrow-fat-up",
	},
	{
		name: "arrow-left",
	},
	{
		name: "arrow-line-down",
	},
	{
		name: "arrow-line-down-left",
	},
	{
		name: "arrow-line-down-right",
	},
	{
		name: "arrow-line-left",
	},
	{
		name: "arrow-line-right",
	},
	{
		name: "arrow-line-up",
	},
	{
		name: "arrow-line-up-left",
	},
	{
		name: "arrow-line-up-right",
	},
	{
		name: "arrow-right",
	},
	{
		name: "arrow-square-down",
	},
	{
		name: "arrow-square-down-left",
	},
	{
		name: "arrow-square-down-right",
	},
	{
		name: "arrow-square-in",
	},
	{
		name: "arrow-square-left",
	},
	{
		name: "arrow-square-out",
	},
	{
		name: "arrow-square-right",
	},
	{
		name: "arrow-square-up",
	},
	{
		name: "arrow-square-up-left",
	},
	{
		name: "arrow-square-up-right",
	},
	{
		name: "arrow-u-down-left",
	},
	{
		name: "arrow-u-down-right",
	},
	{
		name: "arrow-u-left-down",
	},
	{
		name: "arrow-u-left-up",
	},
	{
		name: "arrow-u-right-down",
	},
	{
		name: "arrow-u-right-up",
	},
	{
		name: "arrow-u-up-left",
	},
	{
		name: "arrow-u-up-right",
	},
	{
		name: "arrow-up",
	},
	{
		name: "arrow-up-left",
	},
	{
		name: "arrow-up-right",
	},
	{
		name: "arrows-clockwise",
	},
	{
		name: "arrows-counter-clockwise",
	},
	{
		name: "arrows-down-up",
	},
	{
		name: "arrows-horizontal",
	},
	{
		name: "arrows-in",
	},
	{
		name: "arrows-in-cardinal",
	},
	{
		name: "arrows-in-line-horizontal",
	},
	{
		name: "arrows-in-line-vertical",
	},
	{
		name: "arrows-in-simple",
	},
	{
		name: "arrows-left-right",
	},
	{
		name: "arrows-merge",
	},
	{
		name: "arrows-out",
	},
	{
		name: "arrows-out-cardinal",
	},
	{
		name: "arrows-out-line-horizontal",
	},
	{
		name: "arrows-out-line-vertical",
	},
	{
		name: "arrows-out-simple",
	},
	{
		name: "arrows-split",
	},
	{
		name: "arrows-vertical",
	},
	{
		name: "article",
	},
	{
		name: "article-medium",
	},
	{
		name: "article-ny-times",
	},
	{
		name: "asterisk",
	},
	{
		name: "asterisk-simple",
	},
	{
		name: "at",
	},
	{
		name: "atom",
	},
	{
		name: "baby",
	},
	{
		name: "backpack",
	},
	{
		name: "backspace",
	},
	{
		name: "bag",
	},
	{
		name: "bag-simple",
	},
	{
		name: "balloon",
	},
	{
		name: "bandaids",
	},
	{
		name: "bank",
	},
	{
		name: "barbell",
	},
	{
		name: "barcode",
	},
	{
		name: "barricade",
	},
	{
		name: "baseball",
	},
	{
		name: "baseball-cap",
	},
	{
		name: "basket",
	},
	{
		name: "basketball",
	},
	{
		name: "bathtub",
	},
	{
		name: "battery-charging",
	},
	{
		name: "battery-charging-vertical",
	},
	{
		name: "battery-empty",
	},
	{
		name: "battery-full",
	},
	{
		name: "battery-high",
	},
	{
		name: "battery-low",
	},
	{
		name: "battery-medium",
	},
	{
		name: "battery-plus",
	},
	{
		name: "battery-plus-vertical",
	},
	{
		name: "battery-vertical-empty",
	},
	{
		name: "battery-vertical-full",
	},
	{
		name: "battery-vertical-high",
	},
	{
		name: "battery-vertical-low",
	},
	{
		name: "battery-vertical-medium",
	},
	{
		name: "battery-warning",
	},
	{
		name: "battery-warning-vertical",
	},
	{
		name: "bed",
	},
	{
		name: "beer-bottle",
	},
	{
		name: "beer-stein",
	},
	{
		name: "behance-logo",
	},
	{
		name: "bell",
	},
	{
		name: "bell-ringing",
	},
	{
		name: "bell-simple",
	},
	{
		name: "bell-simple-ringing",
	},
	{
		name: "bell-simple-slash",
	},
	{
		name: "bell-simple-z",
	},
	{
		name: "bell-slash",
	},
	{
		name: "bell-z",
	},
	{
		name: "bezier-curve",
	},
	{
		name: "bicycle",
	},
	{
		name: "binoculars",
	},
	{
		name: "bird",
	},
	{
		name: "bluetooth",
	},
	{
		name: "bluetooth-connected",
	},
	{
		name: "bluetooth-slash",
	},
	{
		name: "bluetooth-x",
	},
	{
		name: "boat",
	},
	{
		name: "bone",
	},
	{
		name: "book",
	},
	{
		name: "book-bookmark",
	},
	{
		name: "book-open",
	},
	{
		name: "book-open-text",
	},
	{
		name: "bookmark",
	},
	{
		name: "bookmark-simple",
	},
	{
		name: "bookmarks",
	},
	{
		name: "bookmarks-simple",
	},
	{
		name: "books",
	},
	{
		name: "boot",
	},
	{
		name: "bounding-box",
	},
	{
		name: "bowl-food",
	},
	{
		name: "brackets-angle",
	},
	{
		name: "brackets-curly",
	},
	{
		name: "brackets-round",
	},
	{
		name: "brackets-square",
	},
	{
		name: "brain",
	},
	{
		name: "brandy",
	},
	{
		name: "bridge",
	},
	{
		name: "briefcase",
	},
	{
		name: "briefcase-metal",
	},
	{
		name: "broadcast",
	},
	{
		name: "broom",
	},
	{
		name: "browser",
	},
	{
		name: "browsers",
	},
	{
		name: "bug",
	},
	{
		name: "bug-beetle",
	},
	{
		name: "bug-droid",
	},
	{
		name: "buildings",
	},
	{
		name: "bus",
	},
	{
		name: "butterfly",
	},
	{
		name: "cactus",
	},
	{
		name: "cake",
	},
	{
		name: "calculator",
	},
	{
		name: "calendar",
	},
	{
		name: "calendar-blank",
	},
	{
		name: "calendar-check",
	},
	{
		name: "calendar-plus",
	},
	{
		name: "calendar-x",
	},
	{
		name: "call-bell",
	},
	{
		name: "camera",
	},
	{
		name: "camera-plus",
	},
	{
		name: "camera-rotate",
	},
	{
		name: "camera-slash",
	},
	{
		name: "campfire",
	},
	{
		name: "car",
	},
	{
		name: "car-profile",
	},
	{
		name: "car-simple",
	},
	{
		name: "cardholder",
	},
	{
		name: "cards",
	},
	{
		name: "caret-circle-double-down",
	},
	{
		name: "caret-circle-double-left",
	},
	{
		name: "caret-circle-double-right",
	},
	{
		name: "caret-circle-double-up",
	},
	{
		name: "caret-circle-down",
	},
	{
		name: "caret-circle-left",
	},
	{
		name: "caret-circle-right",
	},
	{
		name: "caret-circle-up",
	},
	{
		name: "caret-circle-up-down",
	},
	{
		name: "caret-double-down",
	},
	{
		name: "caret-double-left",
	},
	{
		name: "caret-double-right",
	},
	{
		name: "caret-double-up",
	},
	{
		name: "caret-down",
	},
	{
		name: "caret-left",
	},
	{
		name: "caret-right",
	},
	{
		name: "caret-up",
	},
	{
		name: "caret-up-down",
	},
	{
		name: "carrot",
	},
	{
		name: "cassette-tape",
	},
	{
		name: "castle-turret",
	},
	{
		name: "cat",
	},
	{
		name: "cell-signal-full",
	},
	{
		name: "cell-signal-high",
	},
	{
		name: "cell-signal-low",
	},
	{
		name: "cell-signal-medium",
	},
	{
		name: "cell-signal-none",
	},
	{
		name: "cell-signal-slash",
	},
	{
		name: "cell-signal-x",
	},
	{
		name: "certificate",
	},
	{
		name: "chair",
	},
	{
		name: "chalkboard",
	},
	{
		name: "chalkboard-simple",
	},
	{
		name: "chalkboard-teacher",
	},
	{
		name: "champagne",
	},
	{
		name: "charging-station",
	},
	{
		name: "chart-bar",
	},
	{
		name: "chart-bar-horizontal",
	},
	{
		name: "chart-donut",
	},
	{
		name: "chart-line",
	},
	{
		name: "chart-line-down",
	},
	{
		name: "chart-line-up",
	},
	{
		name: "chart-pie",
	},
	{
		name: "chart-pie-slice",
	},
	{
		name: "chart-polar",
	},
	{
		name: "chart-scatter",
	},
	{
		name: "chat",
	},
	{
		name: "chat-centered",
	},
	{
		name: "chat-centered-dots",
	},
	{
		name: "chat-centered-text",
	},
	{
		name: "chat-circle",
	},
	{
		name: "chat-circle-dots",
	},
	{
		name: "chat-circle-text",
	},
	{
		name: "chat-dots",
	},
	{
		name: "chat-teardrop",
	},
	{
		name: "chat-teardrop-dots",
	},
	{
		name: "chat-teardrop-text",
	},
	{
		name: "chat-text",
	},
	{
		name: "chats",
	},
	{
		name: "chats-circle",
	},
	{
		name: "chats-teardrop",
	},
	{
		name: "check",
	},
	{
		name: "check-circle",
	},
	{
		name: "check-fat",
	},
	{
		name: "check-square",
	},
	{
		name: "check-square-offset",
	},
	{
		name: "checks",
	},
	{
		name: "church",
	},
	{
		name: "circle",
	},
	{
		name: "circle-dashed",
	},
	{
		name: "circle-half",
	},
	{
		name: "circle-half-tilt",
	},
	{
		name: "circle-notch",
	},
	{
		name: "circles-four",
	},
	{
		name: "circles-three",
	},
	{
		name: "circles-three-plus",
	},
	{
		name: "circuitry",
	},
	{
		name: "clipboard",
	},
	{
		name: "clipboard-text",
	},
	{
		name: "clock",
	},
	{
		name: "clock-afternoon",
	},
	{
		name: "clock-clockwise",
	},
	{
		name: "clock-countdown",
	},
	{
		name: "clock-counter-clockwise",
	},
	{
		name: "closed-captioning",
	},
	{
		name: "cloud",
	},
	{
		name: "cloud-arrow-down",
	},
	{
		name: "cloud-arrow-up",
	},
	{
		name: "cloud-check",
	},
	{
		name: "cloud-fog",
	},
	{
		name: "cloud-lightning",
	},
	{
		name: "cloud-moon",
	},
	{
		name: "cloud-rain",
	},
	{
		name: "cloud-slash",
	},
	{
		name: "cloud-snow",
	},
	{
		name: "cloud-sun",
	},
	{
		name: "cloud-warning",
	},
	{
		name: "cloud-x",
	},
	{
		name: "club",
	},
	{
		name: "coat-hanger",
	},
	{
		name: "coda-logo",
	},
	{
		name: "code",
	},
	{
		name: "code-block",
	},
	{
		name: "code-simple",
	},
	{
		name: "codepen-logo",
	},
	{
		name: "codesandbox-logo",
	},
	{
		name: "coffee",
	},
	{
		name: "coin",
	},
	{
		name: "coin-vertical",
	},
	{
		name: "coins",
	},
	{
		name: "columns",
	},
	{
		name: "command",
	},
	{
		name: "compass",
	},
	{
		name: "compass-tool",
	},
	{
		name: "computer-tower",
	},
	{
		name: "confetti",
	},
	{
		name: "contactless-payment",
	},
	{
		name: "control",
	},
	{
		name: "cookie",
	},
	{
		name: "cooking-pot",
	},
	{
		name: "copy",
	},
	{
		name: "copy-simple",
	},
	{
		name: "copyleft",
	},
	{
		name: "copyright",
	},
	{
		name: "corners-in",
	},
	{
		name: "corners-out",
	},
	{
		name: "couch",
	},
	{
		name: "cpu",
	},
	{
		name: "credit-card",
	},
	{
		name: "crop",
	},
	{
		name: "cross",
	},
	{
		name: "crosshair",
	},
	{
		name: "crosshair-simple",
	},
	{
		name: "crown",
	},
	{
		name: "crown-simple",
	},
	{
		name: "cube",
	},
	{
		name: "cube-focus",
	},
	{
		name: "cube-transparent",
	},
	{
		name: "currency-btc",
	},
	{
		name: "currency-circle-dollar",
	},
	{
		name: "currency-cny",
	},
	{
		name: "currency-dollar",
	},
	{
		name: "currency-dollar-simple",
	},
	{
		name: "currency-eth",
	},
	{
		name: "currency-eur",
	},
	{
		name: "currency-gbp",
	},
	{
		name: "currency-inr",
	},
	{
		name: "currency-jpy",
	},
	{
		name: "currency-krw",
	},
	{
		name: "currency-kzt",
	},
	{
		name: "currency-ngn",
	},
	{
		name: "currency-rub",
	},
	{
		name: "cursor",
	},
	{
		name: "cursor-click",
	},
	{
		name: "cursor-text",
	},
	{
		name: "cylinder",
	},
	{
		name: "database",
	},
	{
		name: "desktop",
	},
	{
		name: "desktop-tower",
	},
	{
		name: "detective",
	},
	{
		name: "dev-to-logo",
	},
	{
		name: "device-mobile",
	},
	{
		name: "device-mobile-camera",
	},
	{
		name: "device-mobile-speaker",
	},
	{
		name: "device-tablet",
	},
	{
		name: "device-tablet-camera",
	},
	{
		name: "device-tablet-speaker",
	},
	{
		name: "devices",
	},
	{
		name: "diamond",
	},
	{
		name: "diamonds-four",
	},
	{
		name: "dice-five",
	},
	{
		name: "dice-four",
	},
	{
		name: "dice-one",
	},
	{
		name: "dice-six",
	},
	{
		name: "dice-three",
	},
	{
		name: "dice-two",
	},
	{
		name: "disc",
	},
	{
		name: "discord-logo",
	},
	{
		name: "divide",
	},
	{
		name: "dna",
	},
	{
		name: "dog",
	},
	{
		name: "door",
	},
	{
		name: "door-open",
	},
	{
		name: "dot",
	},
	{
		name: "dot-outline",
	},
	{
		name: "dots-nine",
	},
	{
		name: "dots-six",
	},
	{
		name: "dots-six-vertical",
	},
	{
		name: "dots-three",
	},
	{
		name: "dots-three-circle",
	},
	{
		name: "dots-three-circle-vertical",
	},
	{
		name: "dots-three-outline",
	},
	{
		name: "dots-three-outline-vertical",
	},
	{
		name: "dots-three-vertical",
	},
	{
		name: "download",
	},
	{
		name: "download-simple",
	},
	{
		name: "dress",
	},
	{
		name: "dribbble-logo",
	},
	{
		name: "drop",
	},
	{
		name: "drop-half",
	},
	{
		name: "drop-half-bottom",
	},
	{
		name: "dropbox-logo",
	},
	{
		name: "ear",
	},
	{
		name: "ear-slash",
	},
	{
		name: "egg",
	},
	{
		name: "egg-crack",
	},
	{
		name: "eject",
	},
	{
		name: "eject-simple",
	},
	{
		name: "elevator",
	},
	{
		name: "engine",
	},
	{
		name: "envelope",
	},
	{
		name: "envelope-open",
	},
	{
		name: "envelope-simple",
	},
	{
		name: "envelope-simple-open",
	},
	{
		name: "equalizer",
	},
	{
		name: "equals",
	},
	{
		name: "eraser",
	},
	{
		name: "escalator-down",
	},
	{
		name: "escalator-up",
	},
	{
		name: "exam",
	},
	{
		name: "exclude",
	},
	{
		name: "exclude-square",
	},
	{
		name: "export",
	},
	{
		name: "eye",
	},
	{
		name: "eye-closed",
	},
	{
		name: "eye-slash",
	},
	{
		name: "eyedropper",
	},
	{
		name: "eyedropper-sample",
	},
	{
		name: "eyeglasses",
	},
	{
		name: "face-mask",
	},
	{
		name: "facebook-logo",
	},
	{
		name: "factory",
	},
	{
		name: "faders",
	},
	{
		name: "faders-horizontal",
	},
	{
		name: "fan",
	},
	{
		name: "fast-forward",
	},
	{
		name: "fast-forward-circle",
	},
	{
		name: "feather",
	},
	{
		name: "figma-logo",
	},
	{
		name: "file",
	},
	{
		name: "file-archive",
	},
	{
		name: "file-arrow-down",
	},
	{
		name: "file-arrow-up",
	},
	{
		name: "file-audio",
	},
	{
		name: "file-cloud",
	},
	{
		name: "file-code",
	},
	{
		name: "file-css",
	},
	{
		name: "file-csv",
	},
	{
		name: "file-dashed",
	},
	{
		name: "file-doc",
	},
	{
		name: "file-html",
	},
	{
		name: "file-image",
	},
	{
		name: "file-jpg",
	},
	{
		name: "file-js",
	},
	{
		name: "file-jsx",
	},
	{
		name: "file-lock",
	},
	{
		name: "file-minus",
	},
	{
		name: "file-pdf",
	},
	{
		name: "file-plus",
	},
	{
		name: "file-png",
	},
	{
		name: "file-ppt",
	},
	{
		name: "file-rs",
	},
	{
		name: "file-search",
	},
	{
		name: "file-sql",
	},
	{
		name: "file-svg",
	},
	{
		name: "file-text",
	},
	{
		name: "file-ts",
	},
	{
		name: "file-tsx",
	},
	{
		name: "file-video",
	},
	{
		name: "file-vue",
	},
	{
		name: "file-x",
	},
	{
		name: "file-xls",
	},
	{
		name: "file-zip",
	},
	{
		name: "files",
	},
	{
		name: "film-reel",
	},
	{
		name: "film-script",
	},
	{
		name: "film-slate",
	},
	{
		name: "film-strip",
	},
	{
		name: "fingerprint",
	},
	{
		name: "fingerprint-simple",
	},
	{
		name: "finn-the-human",
	},
	{
		name: "fire",
	},
	{
		name: "fire-extinguisher",
	},
	{
		name: "fire-simple",
	},
	{
		name: "first-aid",
	},
	{
		name: "first-aid-kit",
	},
	{
		name: "fish",
	},
	{
		name: "fish-simple",
	},
	{
		name: "flag",
	},
	{
		name: "flag-banner",
	},
	{
		name: "flag-checkered",
	},
	{
		name: "flag-pennant",
	},
	{
		name: "flame",
	},
	{
		name: "flashlight",
	},
	{
		name: "flask",
	},
	{
		name: "floppy-disk",
	},
	{
		name: "floppy-disk-back",
	},
	{
		name: "flow-arrow",
	},
	{
		name: "flower",
	},
	{
		name: "flower-lotus",
	},
	{
		name: "flower-tulip",
	},
	{
		name: "flying-saucer",
	},
	{
		name: "folder",
	},
	{
		name: "folder-dashed",
	},
	{
		name: "folder-lock",
	},
	{
		name: "folder-minus",
	},
	{
		name: "folder-notch",
	},
	{
		name: "folder-notch-minus",
	},
	{
		name: "folder-notch-open",
	},
	{
		name: "folder-notch-plus",
	},
	{
		name: "folder-open",
	},
	{
		name: "folder-plus",
	},
	{
		name: "folder-simple",
	},
	{
		name: "folder-simple-dashed",
	},
	{
		name: "folder-simple-lock",
	},
	{
		name: "folder-simple-minus",
	},
	{
		name: "folder-simple-plus",
	},
	{
		name: "folder-simple-star",
	},
	{
		name: "folder-simple-user",
	},
	{
		name: "folder-star",
	},
	{
		name: "folder-user",
	},
	{
		name: "folders",
	},
	{
		name: "football",
	},
	{
		name: "footprints",
	},
	{
		name: "fork-knife",
	},
	{
		name: "frame-corners",
	},
	{
		name: "framer-logo",
	},
	{
		name: "function",
	},
	{
		name: "funnel",
	},
	{
		name: "funnel-simple",
	},
	{
		name: "game-controller",
	},
	{
		name: "garage",
	},
	{
		name: "gas-can",
	},
	{
		name: "gas-pump",
	},
	{
		name: "gauge",
	},
	{
		name: "gavel",
	},
	{
		name: "gear",
	},
	{
		name: "gear-fine",
	},
	{
		name: "gear-six",
	},
	{
		name: "gender-female",
	},
	{
		name: "gender-intersex",
	},
	{
		name: "gender-male",
	},
	{
		name: "gender-neuter",
	},
	{
		name: "gender-nonbinary",
	},
	{
		name: "gender-transgender",
	},
	{
		name: "ghost",
	},
	{
		name: "gif",
	},
	{
		name: "gift",
	},
	{
		name: "git-branch",
	},
	{
		name: "git-commit",
	},
	{
		name: "git-diff",
	},
	{
		name: "git-fork",
	},
	{
		name: "git-merge",
	},
	{
		name: "git-pull-request",
	},
	{
		name: "github-logo",
	},
	{
		name: "gitlab-logo",
	},
	{
		name: "gitlab-logo-simple",
	},
	{
		name: "globe",
	},
	{
		name: "globe-hemisphere-east",
	},
	{
		name: "globe-hemisphere-west",
	},
	{
		name: "globe-simple",
	},
	{
		name: "globe-stand",
	},
	{
		name: "goggles",
	},
	{
		name: "goodreads-logo",
	},
	{
		name: "google-cardboard-logo",
	},
	{
		name: "google-chrome-logo",
	},
	{
		name: "google-drive-logo",
	},
	{
		name: "google-logo",
	},
	{
		name: "google-photos-logo",
	},
	{
		name: "google-play-logo",
	},
	{
		name: "google-podcasts-logo",
	},
	{
		name: "gradient",
	},
	{
		name: "graduation-cap",
	},
	{
		name: "grains",
	},
	{
		name: "grains-slash",
	},
	{
		name: "graph",
	},
	{
		name: "grid-four",
	},
	{
		name: "grid-nine",
	},
	{
		name: "guitar",
	},
	{
		name: "hamburger",
	},
	{
		name: "hammer",
	},
	{
		name: "hand",
	},
	{
		name: "hand-coins",
	},
	{
		name: "hand-eye",
	},
	{
		name: "hand-fist",
	},
	{
		name: "hand-grabbing",
	},
	{
		name: "hand-heart",
	},
	{
		name: "hand-palm",
	},
	{
		name: "hand-pointing",
	},
	{
		name: "hand-soap",
	},
	{
		name: "hand-swipe-left",
	},
	{
		name: "hand-swipe-right",
	},
	{
		name: "hand-tap",
	},
	{
		name: "hand-waving",
	},
	{
		name: "handbag",
	},
	{
		name: "handbag-simple",
	},
	{
		name: "hands-clapping",
	},
	{
		name: "hands-praying",
	},
	{
		name: "handshake",
	},
	{
		name: "hard-drive",
	},
	{
		name: "hard-drives",
	},
	{
		name: "hash",
	},
	{
		name: "hash-straight",
	},
	{
		name: "headlights",
	},
	{
		name: "headphones",
	},
	{
		name: "headset",
	},
	{
		name: "heart",
	},
	{
		name: "heart-break",
	},
	{
		name: "heart-half",
	},
	{
		name: "heart-straight",
	},
	{
		name: "heart-straight-break",
	},
	{
		name: "heartbeat",
	},
	{
		name: "hexagon",
	},
	{
		name: "high-heel",
	},
	{
		name: "highlighter-circle",
	},
	{
		name: "hoodie",
	},
	{
		name: "horse",
	},
	{
		name: "hourglass",
	},
	{
		name: "hourglass-high",
	},
	{
		name: "hourglass-low",
	},
	{
		name: "hourglass-medium",
	},
	{
		name: "hourglass-simple",
	},
	{
		name: "hourglass-simple-high",
	},
	{
		name: "hourglass-simple-low",
	},
	{
		name: "hourglass-simple-medium",
	},
	{
		name: "house",
	},
	{
		name: "house-line",
	},
	{
		name: "house-simple",
	},
	{
		name: "ice-cream",
	},
	{
		name: "identification-badge",
	},
	{
		name: "identification-card",
	},
	{
		name: "image",
	},
	{
		name: "image-square",
	},
	{
		name: "images",
	},
	{
		name: "images-square",
	},
	{
		name: "infinity",
	},
	{
		name: "info",
	},
	{
		name: "instagram-logo",
	},
	{
		name: "intersect",
	},
	{
		name: "intersect-square",
	},
	{
		name: "intersect-three",
	},
	{
		name: "jeep",
	},
	{
		name: "kanban",
	},
	{
		name: "key",
	},
	{
		name: "key-return",
	},
	{
		name: "keyboard",
	},
	{
		name: "keyhole",
	},
	{
		name: "knife",
	},
	{
		name: "ladder",
	},
	{
		name: "ladder-simple",
	},
	{
		name: "lamp",
	},
	{
		name: "laptop",
	},
	{
		name: "layout",
	},
	{
		name: "leaf",
	},
	{
		name: "lifebuoy",
	},
	{
		name: "lightbulb",
	},
	{
		name: "lightbulb-filament",
	},
	{
		name: "lighthouse",
	},
	{
		name: "lightning",
	},
	{
		name: "lightning-a",
	},
	{
		name: "lightning-slash",
	},
	{
		name: "line-segment",
	},
	{
		name: "line-segments",
	},
	{
		name: "link",
	},
	{
		name: "link-break",
	},
	{
		name: "link-simple",
	},
	{
		name: "link-simple-break",
	},
	{
		name: "link-simple-horizontal",
	},
	{
		name: "link-simple-horizontal-break",
	},
	{
		name: "linkedin-logo",
	},
	{
		name: "linux-logo",
	},
	{
		name: "list",
	},
	{
		name: "list-bullets",
	},
	{
		name: "list-checks",
	},
	{
		name: "list-dashes",
	},
	{
		name: "list-magnifying-glass",
	},
	{
		name: "list-numbers",
	},
	{
		name: "list-plus",
	},
	{
		name: "lock",
	},
	{
		name: "lock-key",
	},
	{
		name: "lock-key-open",
	},
	{
		name: "lock-laminated",
	},
	{
		name: "lock-laminated-open",
	},
	{
		name: "lock-open",
	},
	{
		name: "lock-simple",
	},
	{
		name: "lock-simple-open",
	},
	{
		name: "lockers",
	},
	{
		name: "magic-wand",
	},
	{
		name: "magnet",
	},
	{
		name: "magnet-straight",
	},
	{
		name: "magnifying-glass",
	},
	{
		name: "magnifying-glass-minus",
	},
	{
		name: "magnifying-glass-plus",
	},
	{
		name: "map-pin",
	},
	{
		name: "map-pin-line",
	},
	{
		name: "map-trifold",
	},
	{
		name: "marker-circle",
	},
	{
		name: "martini",
	},
	{
		name: "mask-happy",
	},
	{
		name: "mask-sad",
	},
	{
		name: "math-operations",
	},
	{
		name: "medal",
	},
	{
		name: "medal-military",
	},
	{
		name: "medium-logo",
	},
	{
		name: "megaphone",
	},
	{
		name: "megaphone-simple",
	},
	{
		name: "messenger-logo",
	},
	{
		name: "meta-logo",
	},
	{
		name: "metronome",
	},
	{
		name: "microphone",
	},
	{
		name: "microphone-slash",
	},
	{
		name: "microphone-stage",
	},
	{
		name: "microsoft-excel-logo",
	},
	{
		name: "microsoft-outlook-logo",
	},
	{
		name: "microsoft-powerpoint-logo",
	},
	{
		name: "microsoft-teams-logo",
	},
	{
		name: "microsoft-word-logo",
	},
	{
		name: "minus",
	},
	{
		name: "minus-circle",
	},
	{
		name: "minus-square",
	},
	{
		name: "money",
	},
	{
		name: "monitor",
	},
	{
		name: "monitor-play",
	},
	{
		name: "moon",
	},
	{
		name: "moon-stars",
	},
	{
		name: "moped",
	},
	{
		name: "moped-front",
	},
	{
		name: "mosque",
	},
	{
		name: "motorcycle",
	},
	{
		name: "mountains",
	},
	{
		name: "mouse",
	},
	{
		name: "mouse-simple",
	},
	{
		name: "music-note",
	},
	{
		name: "music-note-simple",
	},
	{
		name: "music-notes",
	},
	{
		name: "music-notes-plus",
	},
	{
		name: "music-notes-simple",
	},
	{
		name: "navigation-arrow",
	},
	{
		name: "needle",
	},
	{
		name: "newspaper",
	},
	{
		name: "newspaper-clipping",
	},
	{
		name: "notches",
	},
	{
		name: "note",
	},
	{
		name: "note-blank",
	},
	{
		name: "note-pencil",
	},
	{
		name: "notebook",
	},
	{
		name: "notepad",
	},
	{
		name: "notification",
	},
	{
		name: "notion-logo",
	},
	{
		name: "number-circle-eight",
	},
	{
		name: "number-circle-five",
	},
	{
		name: "number-circle-four",
	},
	{
		name: "number-circle-nine",
	},
	{
		name: "number-circle-one",
	},
	{
		name: "number-circle-seven",
	},
	{
		name: "number-circle-six",
	},
	{
		name: "number-circle-three",
	},
	{
		name: "number-circle-two",
	},
	{
		name: "number-circle-zero",
	},
	{
		name: "number-eight",
	},
	{
		name: "number-five",
	},
	{
		name: "number-four",
	},
	{
		name: "number-nine",
	},
	{
		name: "number-one",
	},
	{
		name: "number-seven",
	},
	{
		name: "number-six",
	},
	{
		name: "number-square-eight",
	},
	{
		name: "number-square-five",
	},
	{
		name: "number-square-four",
	},
	{
		name: "number-square-nine",
	},
	{
		name: "number-square-one",
	},
	{
		name: "number-square-seven",
	},
	{
		name: "number-square-six",
	},
	{
		name: "number-square-three",
	},
	{
		name: "number-square-two",
	},
	{
		name: "number-square-zero",
	},
	{
		name: "number-three",
	},
	{
		name: "number-two",
	},
	{
		name: "number-zero",
	},
	{
		name: "nut",
	},
	{
		name: "ny-times-logo",
	},
	{
		name: "octagon",
	},
	{
		name: "office-chair",
	},
	{
		name: "option",
	},
	{
		name: "orange-slice",
	},
	{
		name: "package",
	},
	{
		name: "paint-brush",
	},
	{
		name: "paint-brush-broad",
	},
	{
		name: "paint-brush-household",
	},
	{
		name: "paint-bucket",
	},
	{
		name: "paint-roller",
	},
	{
		name: "palette",
	},
	{
		name: "pants",
	},
	{
		name: "paper-plane",
	},
	{
		name: "paper-plane-right",
	},
	{
		name: "paper-plane-tilt",
	},
	{
		name: "paperclip",
	},
	{
		name: "paperclip-horizontal",
	},
	{
		name: "parachute",
	},
	{
		name: "paragraph",
	},
	{
		name: "parallelogram",
	},
	{
		name: "park",
	},
	{
		name: "password",
	},
	{
		name: "path",
	},
	{
		name: "patreon-logo",
	},
	{
		name: "pause",
	},
	{
		name: "pause-circle",
	},
	{
		name: "paw-print",
	},
	{
		name: "paypal-logo",
	},
	{
		name: "peace",
	},
	{
		name: "pen",
	},
	{
		name: "pen-nib",
	},
	{
		name: "pen-nib-straight",
	},
	{
		name: "pencil",
	},
	{
		name: "pencil-circle",
	},
	{
		name: "pencil-line",
	},
	{
		name: "pencil-simple",
	},
	{
		name: "pencil-simple-line",
	},
	{
		name: "pencil-simple-slash",
	},
	{
		name: "pencil-slash",
	},
	{
		name: "pentagram",
	},
	{
		name: "pepper",
	},
	{
		name: "percent",
	},
	{
		name: "person",
	},
	{
		name: "person-arms-spread",
	},
	{
		name: "person-simple",
	},
	{
		name: "person-simple-bike",
	},
	{
		name: "person-simple-run",
	},
	{
		name: "person-simple-throw",
	},
	{
		name: "person-simple-walk",
	},
	{
		name: "perspective",
	},
	{
		name: "phone",
	},
	{
		name: "phone-call",
	},
	{
		name: "phone-disconnect",
	},
	{
		name: "phone-incoming",
	},
	{
		name: "phone-outgoing",
	},
	{
		name: "phone-plus",
	},
	{
		name: "phone-slash",
	},
	{
		name: "phone-x",
	},
	{
		name: "phosphor-logo",
	},
	{
		name: "pi",
	},
	{
		name: "piano-keys",
	},
	{
		name: "picture-in-picture",
	},
	{
		name: "piggy-bank",
	},
	{
		name: "pill",
	},
	{
		name: "pinterest-logo",
	},
	{
		name: "pinwheel",
	},
	{
		name: "pizza",
	},
	{
		name: "placeholder",
	},
	{
		name: "planet",
	},
	{
		name: "plant",
	},
	{
		name: "play",
	},
	{
		name: "play-circle",
	},
	{
		name: "play-pause",
	},
	{
		name: "playlist",
	},
	{
		name: "plug",
	},
	{
		name: "plug-charging",
	},
	{
		name: "plugs",
	},
	{
		name: "plugs-connected",
	},
	{
		name: "plus",
	},
	{
		name: "plus-circle",
	},
	{
		name: "plus-minus",
	},
	{
		name: "plus-square",
	},
	{
		name: "poker-chip",
	},
	{
		name: "police-car",
	},
	{
		name: "polygon",
	},
	{
		name: "popcorn",
	},
	{
		name: "potted-plant",
	},
	{
		name: "power",
	},
	{
		name: "prescription",
	},
	{
		name: "presentation",
	},
	{
		name: "presentation-chart",
	},
	{
		name: "printer",
	},
	{
		name: "prohibit",
	},
	{
		name: "prohibit-inset",
	},
	{
		name: "projector-screen",
	},
	{
		name: "projector-screen-chart",
	},
	{
		name: "pulse",
	},
	{
		name: "push-pin",
	},
	{
		name: "push-pin-simple",
	},
	{
		name: "push-pin-simple-slash",
	},
	{
		name: "push-pin-slash",
	},
	{
		name: "puzzle-piece",
	},
	{
		name: "qr-code",
	},
	{
		name: "question",
	},
	{
		name: "queue",
	},
	{
		name: "quotes",
	},
	{
		name: "radical",
	},
	{
		name: "radio",
	},
	{
		name: "radio-button",
	},
	{
		name: "radioactive",
	},
	{
		name: "rainbow",
	},
	{
		name: "rainbow-cloud",
	},
	{
		name: "read-cv-logo",
	},
	{
		name: "receipt",
	},
	{
		name: "receipt-x",
	},
	{
		name: "record",
	},
	{
		name: "rectangle",
	},
	{
		name: "recycle",
	},
	{
		name: "reddit-logo",
	},
	{
		name: "repeat",
	},
	{
		name: "repeat-once",
	},
	{
		name: "rewind",
	},
	{
		name: "rewind-circle",
	},
	{
		name: "road-horizon",
	},
	{
		name: "robot",
	},
	{
		name: "rocket",
	},
	{
		name: "rocket-launch",
	},
	{
		name: "rows",
	},
	{
		name: "rss",
	},
	{
		name: "rss-simple",
	},
	{
		name: "rug",
	},
	{
		name: "ruler",
	},
	{
		name: "scales",
	},
	{
		name: "scan",
	},
	{
		name: "scissors",
	},
	{
		name: "scooter",
	},
	{
		name: "screencast",
	},
	{
		name: "scribble-loop",
	},
	{
		name: "scroll",
	},
	{
		name: "seal",
	},
	{
		name: "seal-check",
	},
	{
		name: "seal-question",
	},
	{
		name: "seal-warning",
	},
	{
		name: "selection",
	},
	{
		name: "selection-all",
	},
	{
		name: "selection-background",
	},
	{
		name: "selection-foreground",
	},
	{
		name: "selection-inverse",
	},
	{
		name: "selection-plus",
	},
	{
		name: "selection-slash",
	},
	{
		name: "shapes",
	},
	{
		name: "share",
	},
	{
		name: "share-fat",
	},
	{
		name: "share-network",
	},
	{
		name: "shield",
	},
	{
		name: "shield-check",
	},
	{
		name: "shield-checkered",
	},
	{
		name: "shield-chevron",
	},
	{
		name: "shield-plus",
	},
	{
		name: "shield-slash",
	},
	{
		name: "shield-star",
	},
	{
		name: "shield-warning",
	},
	{
		name: "shirt-folded",
	},
	{
		name: "shooting-star",
	},
	{
		name: "shopping-bag",
	},
	{
		name: "shopping-bag-open",
	},
	{
		name: "shopping-cart",
	},
	{
		name: "shopping-cart-simple",
	},
	{
		name: "shower",
	},
	{
		name: "shrimp",
	},
	{
		name: "shuffle",
	},
	{
		name: "shuffle-angular",
	},
	{
		name: "shuffle-simple",
	},
	{
		name: "sidebar",
	},
	{
		name: "sidebar-simple",
	},
	{
		name: "sigma",
	},
	{
		name: "sign-in",
	},
	{
		name: "sign-out",
	},
	{
		name: "signature",
	},
	{
		name: "signpost",
	},
	{
		name: "sim-card",
	},
	{
		name: "siren",
	},
	{
		name: "sketch-logo",
	},
	{
		name: "skip-back",
	},
	{
		name: "skip-back-circle",
	},
	{
		name: "skip-forward",
	},
	{
		name: "skip-forward-circle",
	},
	{
		name: "skull",
	},
	{
		name: "slack-logo",
	},
	{
		name: "sliders",
	},
	{
		name: "sliders-horizontal",
	},
	{
		name: "slideshow",
	},
	{
		name: "smiley",
	},
	{
		name: "smiley-angry",
	},
	{
		name: "smiley-blank",
	},
	{
		name: "smiley-meh",
	},
	{
		name: "smiley-nervous",
	},
	{
		name: "smiley-sad",
	},
	{
		name: "smiley-sticker",
	},
	{
		name: "smiley-wink",
	},
	{
		name: "smiley-x-eyes",
	},
	{
		name: "snapchat-logo",
	},
	{
		name: "sneaker",
	},
	{
		name: "sneaker-move",
	},
	{
		name: "snowflake",
	},
	{
		name: "soccer-ball",
	},
	{
		name: "sort-ascending",
	},
	{
		name: "sort-descending",
	},
	{
		name: "soundcloud-logo",
	},
	{
		name: "spade",
	},
	{
		name: "sparkle",
	},
	{
		name: "speaker-hifi",
	},
	{
		name: "speaker-high",
	},
	{
		name: "speaker-low",
	},
	{
		name: "speaker-none",
	},
	{
		name: "speaker-simple-high",
	},
	{
		name: "speaker-simple-low",
	},
	{
		name: "speaker-simple-none",
	},
	{
		name: "speaker-simple-slash",
	},
	{
		name: "speaker-simple-x",
	},
	{
		name: "speaker-slash",
	},
	{
		name: "speaker-x",
	},
	{
		name: "spinner",
	},
	{
		name: "spinner-gap",
	},
	{
		name: "spiral",
	},
	{
		name: "split-horizontal",
	},
	{
		name: "split-vertical",
	},
	{
		name: "spotify-logo",
	},
	{
		name: "square",
	},
	{
		name: "square-half",
	},
	{
		name: "square-half-bottom",
	},
	{
		name: "square-logo",
	},
	{
		name: "square-split-horizontal",
	},
	{
		name: "square-split-vertical",
	},
	{
		name: "squares-four",
	},
	{
		name: "stack",
	},
	{
		name: "stack-overflow-logo",
	},
	{
		name: "stack-simple",
	},
	{
		name: "stairs",
	},
	{
		name: "stamp",
	},
	{
		name: "star",
	},
	{
		name: "star-and-crescent",
	},
	{
		name: "star-four",
	},
	{
		name: "star-half",
	},
	{
		name: "star-of-david",
	},
	{
		name: "steering-wheel",
	},
	{
		name: "steps",
	},
	{
		name: "stethoscope",
	},
	{
		name: "sticker",
	},
	{
		name: "stool",
	},
	{
		name: "stop",
	},
	{
		name: "stop-circle",
	},
	{
		name: "storefront",
	},
	{
		name: "strategy",
	},
	{
		name: "stripe-logo",
	},
	{
		name: "student",
	},
	{
		name: "subtitles",
	},
	{
		name: "subtract",
	},
	{
		name: "subtract-square",
	},
	{
		name: "suitcase",
	},
	{
		name: "suitcase-rolling",
	},
	{
		name: "suitcase-simple",
	},
	{
		name: "sun",
	},
	{
		name: "sun-dim",
	},
	{
		name: "sun-horizon",
	},
	{
		name: "sunglasses",
	},
	{
		name: "swap",
	},
	{
		name: "swatches",
	},
	{
		name: "swimming-pool",
	},
	{
		name: "sword",
	},
	{
		name: "synagogue",
	},
	{
		name: "syringe",
	},
	{
		name: "t-shirt",
	},
	{
		name: "table",
	},
	{
		name: "tabs",
	},
	{
		name: "tag",
	},
	{
		name: "tag-chevron",
	},
	{
		name: "tag-simple",
	},
	{
		name: "target",
	},
	{
		name: "taxi",
	},
	{
		name: "telegram-logo",
	},
	{
		name: "television",
	},
	{
		name: "television-simple",
	},
	{
		name: "tennis-ball",
	},
	{
		name: "tent",
	},
	{
		name: "terminal",
	},
	{
		name: "terminal-window",
	},
	{
		name: "test-tube",
	},
	{
		name: "text-a-underline",
	},
	{
		name: "text-aa",
	},
	{
		name: "text-align-center",
	},
	{
		name: "text-align-justify",
	},
	{
		name: "text-align-left",
	},
	{
		name: "text-align-right",
	},
	{
		name: "text-b",
	},
	{
		name: "text-columns",
	},
	{
		name: "text-h",
	},
	{
		name: "text-h-five",
	},
	{
		name: "text-h-four",
	},
	{
		name: "text-h-one",
	},
	{
		name: "text-h-six",
	},
	{
		name: "text-h-three",
	},
	{
		name: "text-h-two",
	},
	{
		name: "text-indent",
	},
	{
		name: "text-italic",
	},
	{
		name: "text-outdent",
	},
	{
		name: "text-strikethrough",
	},
	{
		name: "text-t",
	},
	{
		name: "text-underline",
	},
	{
		name: "textbox",
	},
	{
		name: "thermometer",
	},
	{
		name: "thermometer-cold",
	},
	{
		name: "thermometer-hot",
	},
	{
		name: "thermometer-simple",
	},
	{
		name: "thumbs-down",
	},
	{
		name: "thumbs-up",
	},
	{
		name: "ticket",
	},
	{
		name: "tidal-logo",
	},
	{
		name: "tiktok-logo",
	},
	{
		name: "timer",
	},
	{
		name: "tipi",
	},
	{
		name: "toggle-left",
	},
	{
		name: "toggle-right",
	},
	{
		name: "toilet",
	},
	{
		name: "toilet-paper",
	},
	{
		name: "toolbox",
	},
	{
		name: "tooth",
	},
	{
		name: "tote",
	},
	{
		name: "tote-simple",
	},
	{
		name: "trademark",
	},
	{
		name: "trademark-registered",
	},
	{
		name: "traffic-cone",
	},
	{
		name: "traffic-sign",
	},
	{
		name: "traffic-signal",
	},
	{
		name: "train",
	},
	{
		name: "train-regional",
	},
	{
		name: "train-simple",
	},
	{
		name: "tram",
	},
	{
		name: "translate",
	},
	{
		name: "trash",
	},
	{
		name: "trash-simple",
	},
	{
		name: "tray",
	},
	{
		name: "tree",
	},
	{
		name: "tree-evergreen",
	},
	{
		name: "tree-palm",
	},
	{
		name: "tree-structure",
	},
	{
		name: "trend-down",
	},
	{
		name: "trend-up",
	},
	{
		name: "triangle",
	},
	{
		name: "trophy",
	},
	{
		name: "truck",
	},
	{
		name: "twitch-logo",
	},
	{
		name: "twitter-logo",
	},
	{
		name: "umbrella",
	},
	{
		name: "umbrella-simple",
	},
	{
		name: "unite",
	},
	{
		name: "unite-square",
	},
	{
		name: "upload",
	},
	{
		name: "upload-simple",
	},
	{
		name: "usb",
	},
	{
		name: "user",
	},
	{
		name: "user-circle",
	},
	{
		name: "user-circle-gear",
	},
	{
		name: "user-circle-minus",
	},
	{
		name: "user-circle-plus",
	},
	{
		name: "user-focus",
	},
	{
		name: "user-gear",
	},
	{
		name: "user-list",
	},
	{
		name: "user-minus",
	},
	{
		name: "user-plus",
	},
	{
		name: "user-rectangle",
	},
	{
		name: "user-square",
	},
	{
		name: "user-switch",
	},
	{
		name: "users",
	},
	{
		name: "users-four",
	},
	{
		name: "users-three",
	},
	{
		name: "van",
	},
	{
		name: "vault",
	},
	{
		name: "vibrate",
	},
	{
		name: "video",
	},
	{
		name: "video-camera",
	},
	{
		name: "video-camera-slash",
	},
	{
		name: "vignette",
	},
	{
		name: "vinyl-record",
	},
	{
		name: "virtual-reality",
	},
	{
		name: "virus",
	},
	{
		name: "voicemail",
	},
	{
		name: "volleyball",
	},
	{
		name: "wall",
	},
	{
		name: "wallet",
	},
	{
		name: "warehouse",
	},
	{
		name: "warning",
	},
	{
		name: "warning-circle",
	},
	{
		name: "warning-diamond",
	},
	{
		name: "warning-octagon",
	},
	{
		name: "watch",
	},
	{
		name: "wave-sawtooth",
	},
	{
		name: "wave-sine",
	},
	{
		name: "wave-square",
	},
	{
		name: "wave-triangle",
	},
	{
		name: "waveform",
	},
	{
		name: "waves",
	},
	{
		name: "webcam",
	},
	{
		name: "webcam-slash",
	},
	{
		name: "webhooks-logo",
	},
	{
		name: "wechat-logo",
	},
	{
		name: "whatsapp-logo",
	},
	{
		name: "wheelchair",
	},
	{
		name: "wheelchair-motion",
	},
	{
		name: "wifi-high",
	},
	{
		name: "wifi-low",
	},
	{
		name: "wifi-medium",
	},
	{
		name: "wifi-none",
	},
	{
		name: "wifi-slash",
	},
	{
		name: "wifi-x",
	},
	{
		name: "wind",
	},
	{
		name: "windows-logo",
	},
	{
		name: "wine",
	},
	{
		name: "wrench",
	},
	{
		name: "x",
	},
	{
		name: "x-circle",
	},
	{
		name: "x-square",
	},
	{
		name: "yin-yang",
	},
	{
		name: "youtube-logo",
	},
];
export const options = () =>
	object.map((index) => ({
		label: index.name,
		icon: (iconColor: string, size: string = "16", className: string = "") => (
			<svg
				className={className}
				fill={iconColor}
				height={size}
				viewBox="0 0 18 18"
				width={size}
			>
				<use href={`/sprite.svg#${index.name}`} />
			</svg>
		),
	}));

export const optionsMenuListArray = (
	currentPath: string | null,
	bookmarksCountData: {
		data: BookmarksCountTypes;
		error: PostgrestError;
	},
) => [
	{
		icon: <HomeIconGray />,
		name: menuListItemName.allBookmarks,
		href: `/${ALL_BOOKMARKS_URL}`,
		current: currentPath === ALL_BOOKMARKS_URL,
		id: 0,
		count: bookmarksCountData?.data?.allBookmarks,
		iconColor: "",
	},
	{
		icon: <InboxIconGray />,
		name: menuListItemName.inbox,
		href: `/${UNCATEGORIZED_URL}`,
		current: currentPath === UNCATEGORIZED_URL,
		id: 1,
		count: bookmarksCountData?.data?.uncategorized,
		iconColor: "",
	},
	{
		icon: <TrashIconGray />,
		name: menuListItemName.trash,
		href: `/${TRASH_URL}`,
		current: currentPath === TRASH_URL,
		id: 2,
		count: bookmarksCountData?.data?.trash,
		iconColor: "",
	},
	{
		icon: <SettingsIcon />,
		name: menuListItemName.settings,
		href: `/${SETTINGS_URL}`,
		current: currentPath === SETTINGS_URL,
		id: 3,
		count: undefined,
		iconColor: "",
	},
	{
		icon: <ImageIcon />,
		name: menuListItemName.image,
		href: `/${IMAGES_URL}`,
		current: currentPath === IMAGES_URL,
		id: 4,
		count: bookmarksCountData?.data?.images,
		iconColor: "",
	},
	{
		icon: <VideoIcon />,
		name: menuListItemName.videos,
		href: `/${VIDEOS_URL}`,
		current: currentPath === VIDEOS_URL,
		id: 5,
		count: bookmarksCountData?.data?.videos,
		iconColor: "",
	},
	{
		icon: <ArticleIcon />,
		name: menuListItemName.links,
		href: `/${LINKS_URL}`,
		current: currentPath === LINKS_URL,
		id: 6,
		count: bookmarksCountData?.data?.links,
		iconColor: "",
	},
	{
		icon: <FolderIcon />,
		name: menuListItemName.documents,
		href: `/${ALL_BOOKMARKS_URL}`,
		current: false,
		id: 7,
		count: undefined,
		iconColor: "",
	},
];
