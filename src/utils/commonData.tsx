import { type PostgrestError } from "@supabase/supabase-js";

import { AudioIcon } from "../icons/audio-icon";
import FolderIcon from "../icons/folderIcon";
import HomeIconGray from "../icons/home-icon-gray";
import ImageIcon from "../icons/imageIcon";
import InboxIconGray from "../icons/inbox-icon-gray";
import SettingsIcon from "../icons/settingsIcon";
import InstagramIcon from "../icons/social/instagram";
import XIcon from "../icons/social/x-icon";
import TrashIconGray from "../icons/trash-icon-gray";
import VideoIcon from "../icons/videoIcon";
import { type BookmarksCountTypes } from "../types/apiTypes";

import {
	AUDIO_URL,
	DISCOVER_URL,
	DOCUMENTS_URL,
	EVERYTHING_URL,
	IMAGES_URL,
	INSTAGRAM_URL,
	LINKS_URL,
	menuListItemName,
	SETTINGS_URL,
	TRASH_URL,
	TWEETS_URL,
	UNCATEGORIZED_URL,
	VIDEOS_URL,
} from "./constants";
import { DiscoverIcon } from "@/icons/discover-icon";
import { GlobeLinkIcon } from "@/icons/globe-link-icon";

// TODO: check if this is needed (for code cleanup)
const object = [
	{
		name: "shield-dollar",
	},
	{
		name: "passcode",
	},
	{
		name: "shield-01",
	},
	{
		name: "shield-plus",
	},
	{
		name: "key-02",
	},
	{
		name: "shield-02",
	},
	{
		name: "shield-03",
	},
	{
		name: "shield-tick",
	},
	{
		name: "key-01",
	},
	{
		name: "fingerprint-04",
	},
	{
		name: "face-id-square",
	},
	{
		name: "fingerprint-03",
	},
	{
		name: "lock-keyhole-square",
	},
	{
		name: "file-shield-02",
	},
	{
		name: "file-shield-03",
	},
	{
		name: "fingerprint-02",
	},
	{
		name: "file-shield-01",
	},
	{
		name: "shield-zap",
	},
	{
		name: "fingerprint-01",
	},
	{
		name: "scan",
	},
	{
		name: "folder-shield",
	},
	{
		name: "face-id",
	},
	{
		name: "lock-unlocked-01",
	},
	{
		name: "file-lock-02",
	},
	{
		name: "passcode-lock",
	},
	{
		name: "file-lock-03",
	},
	{
		name: "lock-04",
	},
	{
		name: "lock-unlocked-02",
	},
	{
		name: "lock-unlocked-03",
	},
	{
		name: "file-lock-01",
	},
	{
		name: "lock-03",
	},
	{
		name: "lock-02",
	},
	{
		name: "lock-keyhole-circle",
	},
	{
		name: "lock-unlocked-04",
	},
	{
		name: "shield-off",
	},
	{
		name: "lock-01",
	},
	{
		name: "image-user",
	},
	{
		name: "camera-plus",
	},
	{
		name: "camera-lens",
	},
	{
		name: "image-user-down",
	},
	{
		name: "image-down",
	},
	{
		name: "camera-off",
	},
	{
		name: "image-user-plus",
	},
	{
		name: "flash",
	},
	{
		name: "colors",
	},
	{
		name: "image-right",
	},
	{
		name: "image-plus",
	},
	{
		name: "image-check",
	},
	{
		name: "image-user-check",
	},
	{
		name: "image-up",
	},
	{
		name: "image-01",
	},
	{
		name: "flash-off",
	},
	{
		name: "image-x",
	},
	{
		name: "image-user-x",
	},
	{
		name: "camera-03",
	},
	{
		name: "image-user-right",
	},
	{
		name: "camera-02",
	},
	{
		name: "image-user-left",
	},
	{
		name: "camera-01",
	},
	{
		name: "image-user-up",
	},
	{
		name: "image-05",
	},
	{
		name: "image-04",
	},
	{
		name: "share-01-alt",
	},
	{
		name: "link-external-02",
	},
	{
		name: "check-square",
	},
	{
		name: "image-left",
	},
	{
		name: "image-03",
	},
	{
		name: "log-out-01",
	},
	{
		name: "image-02",
	},
	{
		name: "heart-circle",
	},
	{
		name: "help-octagon",
	},
	{
		name: "toggle-02-right",
	},
	{
		name: "info-square",
	},
	{
		name: "speedometer-04",
	},
	{
		name: "building-08",
	},
	{
		name: "log-in-02-alt",
	},
	{
		name: "google-chrome",
	},
	{
		name: "settings-04",
	},
	{
		name: "menu-04",
	},
	{
		name: "link-external-01",
	},
	{
		name: "log-out-03",
	},
	{
		name: "check-circle-broken",
	},
	{
		name: "virus",
	},
	{
		name: "dots-horizontal",
	},
	{
		name: "search-sm",
	},
	{
		name: "upload-01-alt",
	},
	{
		name: "log-out-02",
	},
	{
		name: "menu-05",
	},
	{
		name: "slash-circle-01",
	},
	{
		name: "menu-01",
	},
	{
		name: "equal",
	},
	{
		name: "speedometer-02",
	},
	{
		name: "log-out-01-alt",
	},
	{
		name: "dots-grid",
	},
	{
		name: "slash-circle-02",
	},
	{
		name: "menu-02",
	},
	{
		name: "speedometer-03",
	},
	{
		name: "x-circle",
	},
	{
		name: "settings-01",
	},
	{
		name: "medical-circle",
	},
	{
		name: "plus-square",
	},
	{
		name: "settings-02",
	},
	{
		name: "log-out-04",
	},
	{
		name: "info-hexagon",
	},
	{
		name: "speedometer-01",
	},
	{
		name: "log-in-03-alt",
	},
	{
		name: "check-square-broken",
	},
	{
		name: "settings-03",
	},
	{
		name: "home-smile",
	},
	{
		name: "menu-03",
	},
	{
		name: "zap-off",
	},
	{
		name: "x",
	},
	{
		name: "target-01",
	},
	{
		name: "link-01",
	},
	{
		name: "check-verified-01",
	},
	{
		name: "equal-not",
	},
	{
		name: "translate-02",
	},
	{
		name: "toggle-01-left",
	},
	{
		name: "log-out-03-alt",
	},
	{
		name: "check-verified-02",
	},
	{
		name: "minus-square",
	},
	{
		name: "link-02",
	},
	{
		name: "check-verified-03",
	},
	{
		name: "life-buoy-02",
	},
	{
		name: "archive",
	},
	{
		name: "target-02",
	},
	{
		name: "share-02-alt",
	},
	{
		name: "toggle-03-right",
	},
	{
		name: "link-03",
	},
	{
		name: "heart-rounded",
	},
	{
		name: "zap-circle",
	},
	{
		name: "translate-01",
	},
	{
		name: "log-in-01-alt",
	},
	{
		name: "download-cloud-01",
	},
	{
		name: "save-03",
	},
	{
		name: "life-buoy-01",
	},
	{
		name: "target-03",
	},
	{
		name: "search-refraction",
	},
	{
		name: "medical-cross",
	},
	{
		name: "home-line",
	},
	{
		name: "asterisk-02",
	},
	{
		name: "save-02",
	},
	{
		name: "download-01-alt",
	},
	{
		name: "eye-off",
	},
	{
		name: "download-cloud-02",
	},
	{
		name: "bookmark-minus",
	},
	{
		name: "heart-hand",
	},
	{
		name: "plus",
	},
	{
		name: "help-square",
	},
	{
		name: "target-04",
	},
	{
		name: "heart-hexagon",
	},
	{
		name: "link-04",
	},
	{
		name: "check",
	},
	{
		name: "link-05",
	},
	{
		name: "target-05",
	},
	{
		name: "save-01",
	},
	{
		name: "divide-03",
	},
	{
		name: "asterisk-01",
	},
	{
		name: "percent-01",
	},
	{
		name: "slash-divider",
	},
	{
		name: "share-04",
	},
	{
		name: "log-out-02-alt",
	},
	{
		name: "download-02",
	},
	{
		name: "upload-02",
	},
	{
		name: "info-circle",
	},
	{
		name: "bookmark-x",
	},
	{
		name: "check-circle",
	},
	{
		name: "copy-03",
	},
	{
		name: "pin-02",
	},
	{
		name: "filter-lines",
	},
	{
		name: "x-square",
	},
	{
		name: "share-07",
	},
	{
		name: "search-lg",
	},
	{
		name: "upload-01",
	},
	{
		name: "download-03",
	},
	{
		name: "upload-03",
	},
	{
		name: "heart-octagon",
	},
	{
		name: "divide-02",
	},
	{
		name: "share-06",
	},
	{
		name: "copy-02",
	},
	{
		name: "download-01",
	},
	{
		name: "medical-square",
	},
	{
		name: "percent-02",
	},
	{
		name: "heart-square",
	},
	{
		name: "divide-01",
	},
	{
		name: "copy-01",
	},
	{
		name: "slash-octagon",
	},
	{
		name: "share-02",
	},
	{
		name: "log-in-04",
	},
	{
		name: "share-05",
	},
	{
		name: "search-md",
	},
	{
		name: "percent-03",
	},
	{
		name: "log-in-04-alt",
	},
	{
		name: "at-sign",
	},
	{
		name: "pin-01",
	},
	{
		name: "copy-05",
	},
	{
		name: "download-04",
	},
	{
		name: "upload-04",
	},
	{
		name: "copy-04",
	},
	{
		name: "filter-funnel-02",
	},
	{
		name: "share-03",
	},
	{
		name: "log-in-01",
	},
	{
		name: "share-01",
	},
	{
		name: "copy-06",
	},
	{
		name: "copy-07",
	},
	{
		name: "log-in-03",
	},
	{
		name: "filter-funnel-01",
	},
	{
		name: "anchor",
	},
	{
		name: "check-heart",
	},
	{
		name: "log-in-02",
	},
	{
		name: "zap-fast",
	},
	{
		name: "plus-circle",
	},
	{
		name: "edit-02",
	},
	{
		name: "link-external-01-alt",
	},
	{
		name: "trash-04",
	},
	{
		name: "cloud-blank-02",
	},
	{
		name: "toggle-01-right",
	},
	{
		name: "building-01",
	},
	{
		name: "eye",
	},
	{
		name: "zap",
	},
	{
		name: "hash-01",
	},
	{
		name: "edit-01",
	},
	{
		name: "activity",
	},
	{
		name: "tool-01",
	},
	{
		name: "edit-03",
	},
	{
		name: "home-04",
	},
	{
		name: "log-out-04-alt",
	},
	{
		name: "cloud-blank-01",
	},
	{
		name: "zap-square",
	},
	{
		name: "building-03",
	},
	{
		name: "building-02",
	},
	{
		name: "info-octagon",
	},
	{
		name: "home-05",
	},
	{
		name: "minus-circle",
	},
	{
		name: "hash-02",
	},
	{
		name: "home-01",
	},
	{
		name: "hearts",
	},
	{
		name: "tool-02",
	},
	{
		name: "trash-02",
	},
	{
		name: "edit-04",
	},
	{
		name: "check-done-02",
	},
	{
		name: "loading-03",
	},
	{
		name: "bookmark-add",
	},
	{
		name: "help-hexagon",
	},
	{
		name: "bookmark-check",
	},
	{
		name: "building-06",
	},
	{
		name: "building-07",
	},
	{
		name: "loading-02",
	},
	{
		name: "edit-05",
	},
	{
		name: "upload-cloud-02",
	},
	{
		name: "bookmark",
	},
	{
		name: "trash-03",
	},
	{
		name: "trash-01",
	},
	{
		name: "home-02",
	},
	{
		name: "help-circle",
	},
	{
		name: "building-04",
	},
	{
		name: "minus",
	},
	{
		name: "check-done-01",
	},
	{
		name: "link-broken-02",
	},
	{
		name: "activity-heart",
	},
	{
		name: "building-05",
	},
	{
		name: "link-broken-01",
	},
	{
		name: "dots-vertical",
	},
	{
		name: "loading-01",
	},
	{
		name: "x-close",
	},
	{
		name: "placeholder",
	},
	{
		name: "home-03",
	},
	{
		name: "qr-code-01",
	},
	{
		name: "upload-cloud-01",
	},
	{
		name: "toggle-02-left",
	},
	{
		name: "git-branch-02",
	},
	{
		name: "heart",
	},
	{
		name: "share-04-alt",
	},
	{
		name: "toggle-03-left",
	},
	{
		name: "database-02",
	},
	{
		name: "database-03",
	},
	{
		name: "qr-code-02",
	},
	{
		name: "database-01",
	},
	{
		name: "git-branch-01",
	},
	{
		name: "terminal-circle",
	},
	{
		name: "brackets-check",
	},
	{
		name: "package-minus",
	},
	{
		name: "git-pull-request",
	},
	{
		name: "cpu-chip-02",
	},
	{
		name: "brackets",
	},
	{
		name: "terminal",
	},
	{
		name: "brackets-slash",
	},
	{
		name: "package",
	},
	{
		name: "terminal-browser",
	},
	{
		name: "brackets-plus",
	},
	{
		name: "cpu-chip-01",
	},
	{
		name: "variable",
	},
	{
		name: "container",
	},
	{
		name: "git-merge",
	},
	{
		name: "dataflow-01",
	},
	{
		name: "code-circle-01",
	},
	{
		name: "code-circle-03",
	},
	{
		name: "server-01",
	},
	{
		name: "dataflow-03",
	},
	{
		name: "server-02",
	},
	{
		name: "brackets-ellipses",
	},
	{
		name: "git-commit",
	},
	{
		name: "server-03",
	},
	{
		name: "folder-code",
	},
	{
		name: "dataflow-02",
	},
	{
		name: "code-circle-02",
	},
	{
		name: "code-square-01",
	},
	{
		name: "package-x",
	},
	{
		name: "server-06",
	},
	{
		name: "puzzle-piece-02",
	},
	{
		name: "brackets-minus",
	},
	{
		name: "code-browser",
	},
	{
		name: "code-square-02",
	},
	{
		name: "browser",
	},
	{
		name: "server-04",
	},
	{
		name: "puzzle-piece-01",
	},
	{
		name: "server-05",
	},
	{
		name: "terminal-square",
	},
	{
		name: "dataflow-04",
	},
	{
		name: "package-check",
	},
	{
		name: "package-plus",
	},
	{
		name: "package-search",
	},
	{
		name: "codepen",
	},
	{
		name: "code-01",
	},
	{
		name: "file-code-01",
	},
	{
		name: "code-02",
	},
	{
		name: "columns-01",
	},
	{
		name: "list",
	},
	{
		name: "columns-02",
	},
	{
		name: "align-left-01",
	},
	{
		name: "grid-dots-blank",
	},
	{
		name: "align-left-02",
	},
	{
		name: "file-code-02",
	},
	{
		name: "data",
	},
	{
		name: "columns-03",
	},
	{
		name: "distribute-spacing-horizontal",
	},
	{
		name: "brackets-x",
	},
	{
		name: "spacing-height-02",
	},
	{
		name: "align-bottom-01",
	},
	{
		name: "layers-three-01",
	},
	{
		name: "spacing-height-01",
	},
	{
		name: "align-bottom-02",
	},
	{
		name: "divider",
	},
	{
		name: "align-right-02",
	},
	{
		name: "flex-align-right",
	},
	{
		name: "layout-grid-01",
	},
	{
		name: "grid-dots-left",
	},
	{
		name: "grid-dots-outer",
	},
	{
		name: "align-right-01",
	},
	{
		name: "layers-three-02",
	},
	{
		name: "layout-grid-02",
	},
	{
		name: "grid-dots-top",
	},
	{
		name: "layout-alt-01",
	},
	{
		name: "layout-alt-02",
	},
	{
		name: "align-vertical-center-02",
	},
	{
		name: "align-vertical-center-01",
	},
	{
		name: "layout-alt-03",
	},
	{
		name: "intersect-square",
	},
	{
		name: "spacing-width-02",
	},
	{
		name: "maximize-02",
	},
	{
		name: "grid-01",
	},
	{
		name: "grid-dots-vertical-center",
	},
	{
		name: "align-top-02",
	},
	{
		name: "grid-dots-right",
	},
	{
		name: "layers-two-02",
	},
	{
		name: "align-horizontal-centre-01",
	},
	{
		name: "layout-top",
	},
	{
		name: "layout-alt-04",
	},
	{
		name: "align-horizontal-centre-02",
	},
	{
		name: "layout-right",
	},
	{
		name: "grid-02",
	},
	{
		name: "spacing-width-01",
	},
	{
		name: "maximize-01",
	},
	{
		name: "flex-align-left",
	},
	{
		name: "grid-dots-bottom",
	},
	{
		name: "layers-two-01",
	},
	{
		name: "intersect-circle",
	},
	{
		name: "align-top-01",
	},
	{
		name: "grid-03",
	},
	{
		name: "table",
	},
	{
		name: "rows-03",
	},
	{
		name: "layout-bottom",
	},
	{
		name: "layer-single",
	},
	{
		name: "rows-01",
	},
	{
		name: "flex-align-top",
	},
	{
		name: "grid-dots-horizontal-center",
	},
	{
		name: "rows-02",
	},
	{
		name: "minimize-01",
	},
	{
		name: "layout-left",
	},
	{
		name: "distribute-spacing-vertical",
	},
	{
		name: "flex-align-bottom",
	},
	{
		name: "certificate-02",
	},
	{
		name: "stand",
	},
	{
		name: "minimize-02",
	},
	{
		name: "briefcase-02",
	},
	{
		name: "backpack",
	},
	{
		name: "certificate-01",
	},
	{
		name: "globe-slated-01",
	},
	{
		name: "telescope",
	},
	{
		name: "briefcase-01",
	},
	{
		name: "globe-slated-02",
	},
	{
		name: "graduation-hat-02",
	},
	{
		name: "trophy-02",
	},
	{
		name: "ruler",
	},
	{
		name: "graduation-hat-01",
	},
	{
		name: "trophy-01",
	},
	{
		name: "book-closed",
	},
	{
		name: "atom-02",
	},
	{
		name: "compass",
	},
	{
		name: "atom-01",
	},
	{
		name: "glasses-01",
	},
	{
		name: "beaker-01",
	},
	{
		name: "book-open-02",
	},
	{
		name: "award-04",
	},
	{
		name: "microscope",
	},
	{
		name: "beaker-02",
	},
	{
		name: "glasses-02",
	},
	{
		name: "book-open-01",
	},
	{
		name: "award-05",
	},
	{
		name: "award-01",
	},
	{
		name: "calculator",
	},
	{
		name: "line-chart-up-04",
	},
	{
		name: "chart-breakout-circle",
	},
	{
		name: "line-chart-up-05",
	},
	{
		name: "bar-chart-09",
	},
	{
		name: "award-02",
	},
	{
		name: "award-03",
	},
	{
		name: "pie-chart-04",
	},
	{
		name: "line-chart-up-02",
	},
	{
		name: "bar-chart-08",
	},
	{
		name: "pie-chart-01",
	},
	{
		name: "line-chart-up-03",
	},
	{
		name: "bar-chart-square-minus",
	},
	{
		name: "trend-up-02",
	},
	{
		name: "line-chart-up-01",
	},
	{
		name: "horizontal-bar-chart-03",
	},
	{
		name: "horizontal-bar-chart-02",
	},
	{
		name: "trend-up-01",
	},
	{
		name: "pie-chart-03",
	},
	{
		name: "pie-chart-02",
	},
	{
		name: "horizontal-bar-chart-01",
	},
	{
		name: "bar-chart-square-down",
	},
	{
		name: "chart-breakout-square",
	},
	{
		name: "bar-chart-square-up",
	},
	{
		name: "bar-line-chart",
	},
	{
		name: "bar-chart-03",
	},
	{
		name: "bar-chart-square-02",
	},
	{
		name: "line-chart-down-04",
	},
	{
		name: "bar-chart-square-plus",
	},
	{
		name: "line-chart-down-05",
	},
	{
		name: "bar-chart-02",
	},
	{
		name: "bar-chart-square-03",
	},
	{
		name: "bar-chart-01",
	},
	{
		name: "bar-chart-05",
	},
	{
		name: "line-chart-down-02",
	},
	{
		name: "presentation-chart-01",
	},
	{
		name: "bar-chart-circle-03",
	},
	{
		name: "bar-chart-11",
	},
	{
		name: "line-chart-down-03",
	},
	{
		name: "bar-chart-square-01",
	},
	{
		name: "bar-chart-10",
	},
	{
		name: "circle",
	},
	{
		name: "dice-3",
	},
	{
		name: "trend-down-01",
	},
	{
		name: "bar-chart-circle-02",
	},
	{
		name: "triangle",
	},
	{
		name: "bar-chart-04",
	},
	{
		name: "line-chart-down-01",
	},
	{
		name: "bar-chart-06",
	},
	{
		name: "dice-1",
	},
	{
		name: "dice-5",
	},
	{
		name: "trend-down-02",
	},
	{
		name: "bar-chart-12",
	},
	{
		name: "presentation-chart-02",
	},
	{
		name: "bar-chart-07",
	},
	{
		name: "presentation-chart-03",
	},
	{
		name: "bar-chart-circle-01",
	},
	{
		name: "dice-4",
	},
	{
		name: "cube-outline",
	},
	{
		name: "dice-6",
	},
	{
		name: "star-02",
	},
	{
		name: "star-03",
	},
	{
		name: "cube-01",
	},
	{
		name: "cube-03",
	},
	{
		name: "dice-2",
	},
	{
		name: "cube-04",
	},
	{
		name: "star-01",
	},
	{
		name: "star-05",
	},
	{
		name: "star-06",
	},
	{
		name: "square",
	},
	{
		name: "star-07",
	},
	{
		name: "hexagon-02",
	},
	{
		name: "hexagon-01",
	},
	{
		name: "calendar-check-01",
	},
	{
		name: "clock-plus",
	},
	{
		name: "calendar-heart-01",
	},
	{
		name: "alarm-clock-plus",
	},
	{
		name: "calendar-check-02",
	},
	{
		name: "alarm-clock-check",
	},
	{
		name: "alarm-clock",
	},
	{
		name: "octagon",
	},
	{
		name: "clock-fast-forward",
	},
	{
		name: "calendar-heart-02",
	},
	{
		name: "pentagon",
	},
	{
		name: "alarm-clock-off",
	},
	{
		name: "clock-rewind",
	},
	{
		name: "star-04",
	},
	{
		name: "cube-02",
	},
	{
		name: "clock-snooze",
	},
	{
		name: "watch-circle",
	},
	{
		name: "alarm-clock-minus",
	},
	{
		name: "clock-refresh",
	},
	{
		name: "clock-stopwatch",
	},
	{
		name: "calendar",
	},
	{
		name: "calendar-plus-01",
	},
	{
		name: "calendar-plus-02",
	},
	{
		name: "calendar-date",
	},
	{
		name: "calendar-minus-02",
	},
	{
		name: "clock",
	},
	{
		name: "clock-check",
	},
	{
		name: "hourglass-01",
	},
	{
		name: "calendar-minus-01",
	},
	{
		name: "hourglass-03",
	},
	{
		name: "watch-square",
	},
	{
		name: "user-03",
	},
	{
		name: "users-minus",
	},
	{
		name: "user-minus-01",
	},
	{
		name: "user-up-02",
	},
	{
		name: "face-sad",
	},
	{
		name: "face-content",
	},
	{
		name: "hourglass-02",
	},
	{
		name: "users-plus",
	},
	{
		name: "user-02",
	},
	{
		name: "user-minus-02",
	},
	{
		name: "users-up",
	},
	{
		name: "user-x-02",
	},
	{
		name: "user-square",
	},
	{
		name: "user-01",
	},
	{
		name: "user-x-01",
	},
	{
		name: "users-x",
	},
	{
		name: "users-02",
	},
	{
		name: "users-03",
	},
	{
		name: "user-up-01",
	},
	{
		name: "users-check",
	},
	{
		name: "face-smile",
	},
	{
		name: "users-01",
	},
	{
		name: "face-happy",
	},
	{
		name: "users-right",
	},
	{
		name: "face-neutral",
	},
	{
		name: "users-left",
	},
	{
		name: "users-down",
	},
	{
		name: "face-frown",
	},
	{
		name: "user-down-02",
	},
	{
		name: "user-left-02",
	},
	{
		name: "announcement-03",
	},
	{
		name: "user-left-01",
	},
	{
		name: "user-down-01",
	},
	{
		name: "users-edit",
	},
	{
		name: "user-circle",
	},
	{
		name: "user-right-01",
	},
	{
		name: "user-plus-02",
	},
	{
		name: "user-edit",
	},
	{
		name: "face-wink",
	},
	{
		name: "user-check-02",
	},
	{
		name: "user-right-02",
	},
	{
		name: "user-plus-01",
	},
	{
		name: "user-check-01",
	},
	{
		name: "announcement-01",
	},
	{
		name: "alert-hexagon",
	},
	{
		name: "announcement-02",
	},
	{
		name: "alert-square",
	},
	{
		name: "bell-minus",
	},
	{
		name: "bell-01",
	},
	{
		name: "bell-03",
	},
	{
		name: "bell-ringing-01",
	},
	{
		name: "bell-ringing-02",
	},
	{
		name: "bell-ringing-04",
	},
	{
		name: "notification-message",
	},
	{
		name: "bell-ringing-03",
	},
	{
		name: "thumbs-down",
	},
	{
		name: "bell-plus",
	},
	{
		name: "bell-02",
	},
	{
		name: "notification-box",
	},
	{
		name: "thumbs-up",
	},
	{
		name: "bell-04",
	},
	{
		name: "bell-off-03",
	},
	{
		name: "alert-circle",
	},
	{
		name: "notification-text",
	},
	{
		name: "bell-off-01",
	},
	{
		name: "alert-triangle",
	},
	{
		name: "alert-octagon",
	},
	{
		name: "file-06",
	},
	{
		name: "clipboard-plus",
	},
	{
		name: "bell-off-02",
	},
	{
		name: "clipboard-attachment",
	},
	{
		name: "folder-check",
	},
	{
		name: "clipboard-download",
	},
	{
		name: "clipboard",
	},
	{
		name: "file-07",
	},
	{
		name: "file-minus-01",
	},
	{
		name: "file-minus-03",
	},
	{
		name: "file-minus-02",
	},
	{
		name: "file-05",
	},
	{
		name: "file-04",
	},
	{
		name: "file-01",
	},
	{
		name: "sticker-square",
	},
	{
		name: "folder-x",
	},
	{
		name: "file-03",
	},
	{
		name: "clipboard-minus",
	},
	{
		name: "file-plus-01",
	},
	{
		name: "file-02",
	},
	{
		name: "folder-plus",
	},
	{
		name: "file-attachment-04",
	},
	{
		name: "file-attachment-05",
	},
	{
		name: "paperclip",
	},
	{
		name: "file-plus-02",
	},
	{
		name: "box",
	},
	{
		name: "file-attachment-02",
	},
	{
		name: "file-heart-02",
	},
	{
		name: "file-search-02",
	},
	{
		name: "file-heart-03",
	},
	{
		name: "file-check-02",
	},
	{
		name: "file-attachment-03",
	},
	{
		name: "file-plus-03",
	},
	{
		name: "folder-minus",
	},
	{
		name: "file-x-01",
	},
	{
		name: "file-check-03",
	},
	{
		name: "folder-question",
	},
	{
		name: "file-search-03",
	},
	{
		name: "file-x-02",
	},
	{
		name: "file-question-01",
	},
	{
		name: "clipboard-x",
	},
	{
		name: "file-download-01",
	},
	{
		name: "file-attachment-01",
	},
	{
		name: "folder-lock",
	},
	{
		name: "folder-search",
	},
	{
		name: "sticker-circle",
	},
	{
		name: "file-heart-01",
	},
	{
		name: "folder-download",
	},
	{
		name: "folder",
	},
	{
		name: "file-search-01",
	},
	{
		name: "file-check-01",
	},
	{
		name: "file-x-03",
	},
	{
		name: "file-question-02",
	},
	{
		name: "file-download-02",
	},
	{
		name: "folder-closed",
	},
	{
		name: "file-question-03",
	},
	{
		name: "clipboard-check",
	},
	{
		name: "file-download-03",
	},
	{
		name: "droplets-01",
	},
	{
		name: "hurricane-02",
	},
	{
		name: "hurricane-03",
	},
	{
		name: "thermometer-cold",
	},
	{
		name: "hurricane-01",
	},
	{
		name: "wind-03",
	},
	{
		name: "stars-02",
	},
	{
		name: "stars-01",
	},
	{
		name: "cloud-01",
	},
	{
		name: "lightning-01",
	},
	{
		name: "cloud-snowing-02",
	},
	{
		name: "sunrise",
	},
	{
		name: "cloud-02",
	},
	{
		name: "sun-setting-02",
	},
	{
		name: "stars-03",
	},
	{
		name: "sun-setting-03",
	},
	{
		name: "wind-02",
	},
	{
		name: "sun-setting-01",
	},
	{
		name: "moon-eclipse",
	},
	{
		name: "droplets-02",
	},
	{
		name: "lightning-02",
	},
	{
		name: "thermometer-warm",
	},
	{
		name: "droplets-03",
	},
	{
		name: "cloud-03",
	},
	{
		name: "cloud-snowing-01",
	},
	{
		name: "wind-01",
	},
	{
		name: "thermometer-02",
	},
	{
		name: "sunset",
	},
	{
		name: "thermometer-03",
	},
	{
		name: "umbrella-01",
	},
	{
		name: "cloud-lightning",
	},
	{
		name: "umbrella-03",
	},
	{
		name: "cloud-sun-01",
	},
	{
		name: "snowflake-01",
	},
	{
		name: "cloud-off",
	},
	{
		name: "thermometer-01",
	},
	{
		name: "sun",
	},
	{
		name: "umbrella-02",
	},
	{
		name: "moon-02",
	},
	{
		name: "cloud-sun-03",
	},
	{
		name: "cloud-moon",
	},
	{
		name: "cloud-sun-02",
	},
	{
		name: "compass-02",
	},
	{
		name: "snowflake-02",
	},
	{
		name: "waves",
	},
	{
		name: "passport",
	},
	{
		name: "cloud-raining-01",
	},
	{
		name: "moon-star",
	},
	{
		name: "cloud-raining-03",
	},
	{
		name: "moon-01",
	},
	{
		name: "compass-03",
	},
	{
		name: "compass-01",
	},
	{
		name: "cloud-raining-02",
	},
	{
		name: "luggage-01",
	},
	{
		name: "navigation-pointer-off-01",
	},
	{
		name: "rocket-01",
	},
	{
		name: "cloud-raining-06",
	},
	{
		name: "rocket-02",
	},
	{
		name: "globe-03",
	},
	{
		name: "flag-02",
	},
	{
		name: "cloud-raining-05",
	},
	{
		name: "flag-01",
	},
	{
		name: "cloud-raining-04",
	},
	{
		name: "plane",
	},
	{
		name: "flag-03",
	},
	{
		name: "car-01",
	},
	{
		name: "globe-01",
	},
	{
		name: "truck-01",
	},
	{
		name: "globe-06",
	},
	{
		name: "map-01",
	},
	{
		name: "train",
	},
	{
		name: "navigation-pointer-off-02",
	},
	{
		name: "globe-05",
	},
	{
		name: "map-02",
	},
	{
		name: "flag-06",
	},
	{
		name: "globe-04",
	},
	{
		name: "tram",
	},
	{
		name: "car-02",
	},
	{
		name: "flag-04",
	},
	{
		name: "flag-05",
	},
	{
		name: "luggage-02",
	},
	{
		name: "bus",
	},
	{
		name: "ticket-02",
	},
	{
		name: "mark",
	},
	{
		name: "arrow-square-up",
	},
	{
		name: "luggage-03",
	},
	{
		name: "marker-pin-01",
	},
	{
		name: "refresh-ccw-02",
	},
	{
		name: "globe-02",
	},
	{
		name: "navigation-pointer-01",
	},
	{
		name: "refresh-cw-05",
	},
	{
		name: "route",
	},
	{
		name: "marker-pin-06",
	},
	{
		name: "marker-pin-04",
	},
	{
		name: "marker-pin-02",
	},
	{
		name: "truck-02",
	},
	{
		name: "marker-pin-05",
	},
	{
		name: "marker-pin-03",
	},
	{
		name: "ticket-01",
	},
	{
		name: "navigation-pointer-02",
	},
	{
		name: "corner-left-up",
	},
	{
		name: "arrow-down",
	},
	{
		name: "chevron-selector-horizontal",
	},
	{
		name: "corner-up-right",
	},
	{
		name: "arrow-square-left",
	},
	{
		name: "refresh-ccw-03",
	},
	{
		name: "corner-right-up",
	},
	{
		name: "refresh-cw-04",
	},
	{
		name: "expand-06",
	},
	{
		name: "expand-04",
	},
	{
		name: "refresh-ccw-04",
	},
	{
		name: "refresh-ccw-01",
	},
	{
		name: "arrow-up-left",
	},
	{
		name: "chevron-left-double",
	},
	{
		name: "expand-05",
	},
	{
		name: "refresh-cw-03",
	},
	{
		name: "arrows-down",
	},
	{
		name: "expand-01",
	},
	{
		name: "chevron-down",
	},
	{
		name: "arrow-square-down-right",
	},
	{
		name: "arrow-circle-up",
	},
	{
		name: "arrow-narrow-up-right",
	},
	{
		name: "expand-03",
	},
	{
		name: "refresh-ccw-05",
	},
	{
		name: "expand-02",
	},
	{
		name: "refresh-cw-02",
	},
	{
		name: "refresh-cw-01",
	},
	{
		name: "arrow-circle-broken-left",
	},
	{
		name: "arrow-down-left",
	},
	{
		name: "chevron-up",
	},
	{
		name: "chevron-right",
	},
	{
		name: "reverse-right",
	},
	{
		name: "arrow-circle-broken-up-right",
	},
	{
		name: "corner-down-right",
	},
	{
		name: "arrow-square-right",
	},
	{
		name: "arrow-right",
	},
	{
		name: "arrow-circle-broken-down-left",
	},
	{
		name: "arrows-right",
	},
	{
		name: "corner-right-down",
	},
	{
		name: "arrow-narrow-left",
	},
	{
		name: "corner-up-left",
	},
	{
		name: "arrow-narrow-up-left",
	},
	{
		name: "arrow-narrow-down-right",
	},
	{
		name: "switch-vertical-01",
	},
	{
		name: "arrow-circle-right",
	},
	{
		name: "arrow-square-up-right",
	},
	{
		name: "arrow-block-left",
	},
	{
		name: "arrow-narrow-up",
	},
	{
		name: "arrow-block-down",
	},
	{
		name: "switch-horizontal-01",
	},
	{
		name: "arrow-circle-left",
	},
	{
		name: "switch-horizontal-02",
	},
	{
		name: "arrow-circle-broken-up",
	},
	{
		name: "switch-vertical-02",
	},
	{
		name: "corner-left-down",
	},
	{
		name: "infinity",
	},
	{
		name: "arrow-circle-up-left",
	},
	{
		name: "chevron-down-double",
	},
	{
		name: "arrow-square-up-left",
	},
	{
		name: "flip-backward",
	},
	{
		name: "chevron-selector-vertical",
	},
	{
		name: "arrow-circle-down-right",
	},
	{
		name: "arrow-narrow-down-left",
	},
	{
		name: "arrows-up",
	},
	{
		name: "arrows-left",
	},
	{
		name: "arrow-up-right",
	},
	{
		name: "arrow-block-right",
	},
	{
		name: "arrow-circle-down-left",
	},
	{
		name: "arrow-up",
	},
	{
		name: "arrow-circle-broken-up-left",
	},
	{
		name: "arrow-square-down",
	},
	{
		name: "arrow-left",
	},
	{
		name: "chevron-up-double",
	},
	{
		name: "arrow-block-up",
	},
	{
		name: "arrow-square-down-left",
	},
	{
		name: "arrow-circle-broken-right",
	},
	{
		name: "flip-forward",
	},
	{
		name: "arrow-down-right",
	},
	{
		name: "arrow-narrow-down",
	},
	{
		name: "arrow-circle-down",
	},
	{
		name: "arrow-circle-broken-down",
	},
	{
		name: "reverse-left",
	},
	{
		name: "arrow-narrow-right",
	},
	{
		name: "arrow-circle-broken-down-right",
	},
	{
		name: "arrow-circle-up-right",
	},
	{
		name: "chevron-right-double",
	},
	{
		name: "annotation-question",
	},
	{
		name: "message-x-circle",
	},
	{
		name: "annotation-check",
	},
	{
		name: "corner-down-left",
	},
	{
		name: "annotation-info",
	},
	{
		name: "arrows-triangle",
	},
	{
		name: "chevron-left",
	},
	{
		name: "annotation-plus",
	},
	{
		name: "message-question-circle",
	},
	{
		name: "phone-plus",
	},
	{
		name: "message-alert-circle",
	},
	{
		name: "message-notification-square",
	},
	{
		name: "message-smile-square",
	},
	{
		name: "annotation-alert",
	},
	{
		name: "message-plus-square",
	},
	{
		name: "phone-call-02",
	},
	{
		name: "inbox-01",
	},
	{
		name: "message-check-circle",
	},
	{
		name: "annotation-dots",
	},
	{
		name: "message-heart-square",
	},
	{
		name: "message-dots-circle",
	},
	{
		name: "phone-call-01",
	},
	{
		name: "message-text-circle-02",
	},
	{
		name: "message-question-square",
	},
	{
		name: "message-chat-circle",
	},
	{
		name: "inbox-02",
	},
	{
		name: "phone-x",
	},
	{
		name: "annotation-heart",
	},
	{
		name: "message-x-square",
	},
	{
		name: "phone-hang-up",
	},
	{
		name: "message-text-circle-01",
	},
	{
		name: "message-text-square-02",
	},
	{
		name: "message-text-square-01",
	},
	{
		name: "message-smile-circle",
	},
	{
		name: "message-notification-circle",
	},
	{
		name: "phone",
	},
	{
		name: "message-alert-square",
	},
	{
		name: "mail-04",
	},
	{
		name: "phone-outgoing-01",
	},
	{
		name: "mail-03",
	},
	{
		name: "message-circle-02",
	},
	{
		name: "message-circle-01",
	},
	{
		name: "message-plus-circle",
	},
	{
		name: "annotation-x",
	},
	{
		name: "message-dots-square",
	},
	{
		name: "phone-pause",
	},
	{
		name: "mail-02",
	},
	{
		name: "mail-05",
	},
	{
		name: "phone-incoming-01",
	},
	{
		name: "message-square-01",
	},
	{
		name: "message-square-02",
	},
	{
		name: "send-01",
	},
	{
		name: "send-03",
	},
	{
		name: "message-chat-square",
	},
	{
		name: "message-check-square",
	},
	{
		name: "message-heart-circle",
	},
	{
		name: "mail-01",
	},
	{
		name: "phone-incoming-02",
	},
	{
		name: "annotation",
	},
	{
		name: "send-02",
	},
	{
		name: "phone-outgoing-02",
	},
	{
		name: "credit-card-down",
	},
	{
		name: "cryptocurrency-04",
	},
	{
		name: "wallet-02",
	},
	{
		name: "currency-bitcoin",
	},
	{
		name: "receipt",
	},
	{
		name: "credit-card-x",
	},
	{
		name: "shopping-bag-01",
	},
	{
		name: "shopping-bag-02",
	},
	{
		name: "currency-pound",
	},
	{
		name: "credit-card-refresh",
	},
	{
		name: "wallet-03",
	},
	{
		name: "scales-02",
	},
	{
		name: "scales-01",
	},
	{
		name: "credit-card-shield",
	},
	{
		name: "currency-yen-circle",
	},
	{
		name: "wallet-05",
	},
	{
		name: "wallet-04",
	},
	{
		name: "cryptocurrency-01",
	},
	{
		name: "credit-card-minus",
	},
	{
		name: "diamond-02",
	},
	{
		name: "currency-dollar-circle",
	},
	{
		name: "shopping-cart-03",
	},
	{
		name: "coins-swap-02",
	},
	{
		name: "shopping-bag-03",
	},
	{
		name: "safe",
	},
	{
		name: "shopping-cart-01",
	},
	{
		name: "cryptocurrency-02",
	},
	{
		name: "currency-rupee",
	},
	{
		name: "currency-ethereum-circle",
	},
	{
		name: "cryptocurrency-03",
	},
	{
		name: "receipt-check",
	},
	{
		name: "diamond-01",
	},
	{
		name: "coins-swap-01",
	},
	{
		name: "wallet-01",
	},
	{
		name: "currency-ruble",
	},
	{
		name: "credit-card-plus",
	},
	{
		name: "shopping-cart-02",
	},
	{
		name: "credit-card-lock",
	},
	{
		name: "credit-card-search",
	},
	{
		name: "currency-bitcoin-circle",
	},
	{
		name: "gift-02",
	},
	{
		name: "tag-03",
	},
	{
		name: "tag-02",
	},
	{
		name: "credit-card-01",
	},
	{
		name: "coins-04",
	},
	{
		name: "gift-01",
	},
	{
		name: "currency-yen",
	},
	{
		name: "tag-01",
	},
	{
		name: "credit-card-02",
	},
	{
		name: "credit-card-download",
	},
	{
		name: "credit-card-edit",
	},
	{
		name: "credit-card-upload",
	},
	{
		name: "currency-pound-circle",
	},
	{
		name: "coins-02",
	},
	{
		name: "currency-euro-circle",
	},
	{
		name: "coins-hand",
	},
	{
		name: "credit-card-check",
	},
	{
		name: "coins-01",
	},
	{
		name: "bank",
	},
	{
		name: "currency-euro",
	},
	{
		name: "currency-ruble-circle",
	},
	{
		name: "coins-03",
	},
	{
		name: "sale-01",
	},
	{
		name: "currency-rupee-circle",
	},
	{
		name: "coins-stacked-02",
	},
	{
		name: "piggy-bank-02",
	},
	{
		name: "coins-stacked-01",
	},
	{
		name: "piggy-bank-01",
	},
	{
		name: "coins-stacked-03",
	},
	{
		name: "sale-02",
	},
	{
		name: "sale-03",
	},
	{
		name: "bank-note-02",
	},
	{
		name: "coins-stacked-04",
	},
	{
		name: "bank-note-03",
	},
	{
		name: "currency-ethereum",
	},
	{
		name: "eraser",
	},
	{
		name: "credit-card-up",
	},
	{
		name: "hand",
	},
	{
		name: "currency-dollar",
	},
	{
		name: "subscript",
	},
	{
		name: "dropper",
	},
	{
		name: "figma",
	},
	{
		name: "bank-note-01",
	},
	{
		name: "left-indent-01",
	},
	{
		name: "sale-04",
	},
	{
		name: "left-indent-02",
	},
	{
		name: "italic-02",
	},
	{
		name: "bold-square",
	},
	{
		name: "bold-02",
	},
	{
		name: "heading-square",
	},
	{
		name: "scissors-01",
	},
	{
		name: "align-justify",
	},
	{
		name: "paint",
	},
	{
		name: "italic-square",
	},
	{
		name: "image-indent-right",
	},
	{
		name: "bold-01",
	},
	{
		name: "italic-01",
	},
	{
		name: "skew",
	},
	{
		name: "scissors-02",
	},
	{
		name: "transform",
	},
	{
		name: "move",
	},
	{
		name: "type-square",
	},
	{
		name: "pen-tool-01",
	},
	{
		name: "reflect-01",
	},
	{
		name: "heading-02",
	},
	{
		name: "pen-tool-02",
	},
	{
		name: "reflect-02",
	},
	{
		name: "heading-01",
	},
	{
		name: "cursor-click-01",
	},
	{
		name: "paint-pour",
	},
	{
		name: "strikethrough-01",
	},
	{
		name: "bezier-curve-02",
	},
	{
		name: "paragraph-spacing",
	},
	{
		name: "contrast-02",
	},
	{
		name: "bezier-curve-03",
	},
	{
		name: "colors",
	},
	{
		name: "contrast-03",
	},
	{
		name: "cursor-click-02",
	},
	{
		name: "contrast-01",
	},
	{
		name: "align-right",
	},
	{
		name: "strikethrough-02",
	},
	{
		name: "cursor-box",
	},
	{
		name: "strikethrough-square",
	},
	{
		name: "cursor-04",
	},
	{
		name: "line-height",
	},
	{
		name: "bezier-curve-01",
	},
	{
		name: "zoom-in",
	},
	{
		name: "roller-brush",
	},
	{
		name: "image-indent-left",
	},
	{
		name: "perspective-02",
	},
	{
		name: "palette",
	},
	{
		name: "circle-cut",
	},
	{
		name: "zoom-out",
	},
	{
		name: "perspective-01",
	},
	{
		name: "pilcrow-square",
	},
	{
		name: "paragraph-wrap",
	},
	{
		name: "crop-01",
	},
	{
		name: "cursor-02",
	},
	{
		name: "feather",
	},
	{
		name: "pilcrow-01",
	},
	{
		name: "underline-02",
	},
	{
		name: "cursor-03",
	},
	{
		name: "right-indent-02",
	},
	{
		name: "cursor-01",
	},
	{
		name: "underline-01",
	},
	{
		name: "crop-02",
	},
	{
		name: "right-indent-01",
	},
	{
		name: "delete",
	},
	{
		name: "pilcrow-02",
	},
	{
		name: "command",
	},
	{
		name: "pencil-02",
	},
	{
		name: "magic-wand-01",
	},
	{
		name: "pencil-01",
	},
	{
		name: "pen-tool-minus",
	},
	{
		name: "underline-square",
	},
	{
		name: "dotpoints-01",
	},
	{
		name: "text-input",
	},
	{
		name: "pencil-line",
	},
	{
		name: "framer",
	},
	{
		name: "scale-03",
	},
	{
		name: "dotpoints-02",
	},
	{
		name: "magic-wand-02",
	},
	{
		name: "brush-02",
	},
	{
		name: "code-snippet-02",
	},
	{
		name: "align-center",
	},
	{
		name: "pen-tool-plus",
	},
	{
		name: "type-01",
	},
	{
		name: "type-strikethrough-01",
	},
	{
		name: "scissors-cut-02",
	},
	{
		name: "letter-spacing-01",
	},
	{
		name: "drop",
	},
	{
		name: "attachment-02",
	},
	{
		name: "brush-03",
	},
	{
		name: "scale-02",
	},
	{
		name: "code-snippet-01",
	},
	{
		name: "type-02",
	},
	{
		name: "brush-01",
	},
	{
		name: "scissors-cut-01",
	},
	{
		name: "attachment-01",
	},
	{
		name: "type-strikethrough-02",
	},
	{
		name: "scale-01",
	},
	{
		name: "pause-circle",
	},
	{
		name: "letter-spacing-02",
	},
	{
		name: "align-left",
	},
	{
		name: "film-01",
	},
	{
		name: "modem-01",
	},
	{
		name: "bluetooth-off",
	},
	{
		name: "clapperboard",
	},
	{
		name: "film-02",
	},
	{
		name: "play-circle",
	},
	{
		name: "film-03",
	},
	{
		name: "video-recorder-off",
	},
	{
		name: "bluetooth-connect",
	},
	{
		name: "modem-02",
	},
	{
		name: "microphone-off-02",
	},
	{
		name: "airpods",
	},
	{
		name: "airplay",
	},
	{
		name: "volume-min",
	},
	{
		name: "microphone-off-01",
	},
	{
		name: "voicemail",
	},
	{
		name: "volume-plus",
	},
	{
		name: "laptop-02",
	},
	{
		name: "lightbulb-04",
	},
	{
		name: "stop-circle",
	},
	{
		name: "laptop-01",
	},
	{
		name: "lightbulb-05",
	},
	{
		name: "bluetooth-signal",
	},
	{
		name: "skip-forward",
	},
	{
		name: "music-note-02",
	},
	{
		name: "shuffle-01",
	},
	{
		name: "podcast",
	},
	{
		name: "stop",
	},
	{
		name: "repeat-04",
	},
	{
		name: "power-01",
	},
	{
		name: "lightbulb-01",
	},
	{
		name: "rss-01",
	},
	{
		name: "repeat-01",
	},
	{
		name: "chrome-cast",
	},
	{
		name: "rss-02",
	},
	{
		name: "battery-full",
	},
	{
		name: "lightbulb-02",
	},
	{
		name: "music-note-01",
	},
	{
		name: "repeat-03",
	},
	{
		name: "hard-drive",
	},
	{
		name: "power-03",
	},
	{
		name: "bluetooth-on",
	},
	{
		name: "shuffle-02",
	},
	{
		name: "wifi",
	},
	{
		name: "lightbulb-03",
	},
	{
		name: "power-02",
	},
	{
		name: "repeat-02",
	},
	{
		name: "pause-square",
	},
	{
		name: "play-square",
	},
	{
		name: "monitor-05",
	},
	{
		name: "fast-forward",
	},
	{
		name: "volume-minus",
	},
	{
		name: "keyboard-01",
	},
	{
		name: "monitor-04",
	},
	{
		name: "recording-02",
	},
	{
		name: "phone-01",
	},
	{
		name: "recording-03",
	},
	{
		name: "fast-backward",
	},
	{
		name: "keyboard-02",
	},
	{
		name: "battery-low",
	},
	{
		name: "play",
	},
	{
		name: "recording-01",
	},
	{
		name: "phone-02",
	},
	{
		name: "battery-empty",
	},
	{
		name: "printer",
	},
	{
		name: "monitor-02",
	},
	{
		name: "tablet-02",
	},
	{
		name: "volume-max",
	},
	{
		name: "monitor-03",
	},
	{
		name: "battery-mid",
	},
	{
		name: "music-note-plus",
	},
	{
		name: "wifi-off",
	},
	{
		name: "youtube",
	},
	{
		name: "gaming-pad-01",
	},
	{
		name: "skip-back",
	},
	{
		name: "sliders-03",
	},
	{
		name: "video-recorder",
	},
	{
		name: "tablet-01",
	},
	{
		name: "simcard",
	},
	{
		name: "monitor-01",
	},
	{
		name: "speaker-01",
	},
	{
		name: "tv-01",
	},
	{
		name: "headphones-02",
	},
	{
		name: "webcam-01",
	},
	{
		name: "stop-square",
	},
	{
		name: "sliders-02",
	},
	{
		name: "speaker-03",
	},
	{
		name: "gaming-pad-02",
	},
	{
		name: "volume-x",
	},
	{
		name: "tv-02",
	},
	{
		name: "tv-03",
	},
	{
		name: "speaker-02",
	},
	{
		name: "webcam-02",
	},
	{
		name: "microphone-02",
	},
	{
		name: "headphones-01",
	},
	{
		name: "sliders-01",
	},
	{
		name: "signal-01",
	},
];
export const iconOptions = object.map((index) => ({
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

/**
 * Pre-computed Map for O(1) icon lookups by label
 * Replaces O(n) find() operations in icon rendering
 */
export const iconMap = new Map(iconOptions.map((opt) => [opt.label, opt]));

/**
 * @deprecated Use `iconOptions` instead - cached at module level
 */
export const options = () => iconOptions;

export const optionsMenuListArray = (
	currentPath: string | null,
	bookmarksCountData: {
		data: BookmarksCountTypes;
		error: PostgrestError;
	},
) => [
	{
		icon: <HomeIconGray />,
		name: menuListItemName.everything,
		href: `/${EVERYTHING_URL}`,
		current: currentPath === EVERYTHING_URL,
		id: 0,
		count: bookmarksCountData?.data?.everything,
		iconColor: "",
	},
	{
		icon: <DiscoverIcon className="h-[18px] w-[18px]" />,
		name: menuListItemName.discover,
		href: `/${DISCOVER_URL}`,
		current: currentPath === DISCOVER_URL,
		id: 1,
		count: undefined,
		iconColor: "",
	},
	{
		icon: <InboxIconGray />,
		name: menuListItemName.inbox,
		href: `/${UNCATEGORIZED_URL}`,
		current: currentPath === UNCATEGORIZED_URL,
		id: 2,
		count: bookmarksCountData?.data?.uncategorized,
		iconColor: "",
	},
	{
		icon: <TrashIconGray />,
		name: menuListItemName.trash,
		href: `/${TRASH_URL}`,
		current: currentPath === TRASH_URL,
		id: 3,
		count: bookmarksCountData?.data?.trash,
		iconColor: "",
	},
	{
		icon: <SettingsIcon />,
		name: menuListItemName.settings,
		href: `/${SETTINGS_URL}`,
		current: currentPath === SETTINGS_URL,
		id: 4,
		count: undefined,
		iconColor: "",
	},
	{
		icon: (
			<figure className="flex h-[18px] w-[18px] items-center justify-center">
				<ImageIcon />
			</figure>
		),
		name: menuListItemName.image,
		href: `/${IMAGES_URL}`,
		current: currentPath === IMAGES_URL,
		id: 5,
		count: bookmarksCountData?.data?.images,
		iconColor: "",
	},
	{
		icon: (
			<figure className="flex h-[18px] w-[18px] items-center justify-center">
				<VideoIcon />
			</figure>
		),
		name: menuListItemName.videos,
		href: `/${VIDEOS_URL}`,
		current: currentPath === VIDEOS_URL,
		id: 6,
		count: bookmarksCountData?.data?.videos,
		iconColor: "",
	},
	{
		icon: (
			<figure className="flex h-[18px] w-[18px] items-center justify-center">
				<GlobeLinkIcon />
			</figure>
		),
		name: menuListItemName.links,
		href: `/${LINKS_URL}`,
		current: currentPath === LINKS_URL,
		id: 7,
		count: bookmarksCountData?.data?.links,
		iconColor: "",
	},
	{
		icon: (
			<figure className="flex h-[18px] w-[18px] items-center justify-center">
				<FolderIcon />
			</figure>
		),
		name: menuListItemName.documents,
		href: `/${DOCUMENTS_URL}`,
		current: currentPath === DOCUMENTS_URL,
		id: 8,
		count: bookmarksCountData?.data?.documents,
		iconColor: "",
	},
	{
		icon: (
			<figure className="flex h-[18px] w-[18px] items-center justify-center">
				<XIcon />
			</figure>
		),
		name: menuListItemName.tweets,
		href: `/${TWEETS_URL}`,
		current: currentPath === TWEETS_URL,
		id: 9,
		count: bookmarksCountData?.data?.tweets,
		iconColor: "",
	},
	{
		icon: <InstagramIcon className="text-gray-900" />,
		name: menuListItemName.instagram,
		href: `/${INSTAGRAM_URL}`,
		current: currentPath === INSTAGRAM_URL,
		id: 10,
		count: bookmarksCountData?.data?.instagram,
		iconColor: "",
	},
	{
		icon: <AudioIcon />,
		name: menuListItemName.audio,
		href: `/${AUDIO_URL}`,
		current: currentPath === AUDIO_URL,
		id: 11,
		count: bookmarksCountData?.data?.audio,
		iconColor: "",
	},
];
