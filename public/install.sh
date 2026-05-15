#!/usr/bin/env sh
# install.sh — Ikenga installer (macOS + Linux, x86_64).
#
# Usage:
#   curl -fsSL https://ikenga.dev/install.sh | sh
#
# Environment overrides:
#   IKENGA_VERSION       Pin a release tag (default: latest published).
#   IKENGA_INSTALL_DIR   Linux portable install dir (default: $HOME/.local/bin).
#   IKENGA_REPO          Source repo (default: royalti-io/ikenga).
#
# Windows is not handled here — use winget:
#   winget install Ikenga.Shell
#
# This script is meant to be safe under `curl … | sh` (non-interactive, no
# `read`, no surprise sudo). It prints clear messages and exits non-zero on
# any unsupported OS / arch / missing-release condition.

set -eu

REPO="${IKENGA_REPO:-royalti-io/ikenga}"
VERSION="${IKENGA_VERSION:-latest}"

# ─── colour helpers ────────────────────────────────────────────────────────
if [ -t 1 ] && command -v tput >/dev/null 2>&1 && [ "$(tput colors 2>/dev/null || echo 0)" -ge 8 ]; then
	bold="$(tput bold)"; dim="$(tput dim)"; reset="$(tput sgr0)"
	ember="$(tput setaf 1)"; amber="$(tput setaf 3)"
else
	bold=""; dim=""; reset=""; ember=""; amber=""
fi

say()  { printf '%s%s%s\n' "$bold" "$1" "$reset"; }
hint() { printf '%s%s%s\n' "$dim"  "$1" "$reset"; }
warn() { printf '%s%s%s\n' "$amber" "$1" "$reset" >&2; }
fail() { printf '%s%s%s\n' "$ember" "$1" "$reset" >&2; exit 1; }

# ─── OS / arch detection ───────────────────────────────────────────────────
uname_s="$(uname -s)"
uname_m="$(uname -m)"

case "$uname_s" in
	Darwin) os=darwin ;;
	Linux)  os=linux ;;
	MINGW*|MSYS*|CYGWIN*|Windows_NT)
		say "Ikenga on Windows"
		echo "Install with winget:"
		echo "  winget install Ikenga.Shell"
		echo
		echo "Or download the installer directly:"
		echo "  https://github.com/$REPO/releases/latest"
		exit 0
		;;
	*) fail "Unsupported OS: $uname_s" ;;
esac

case "$uname_m" in
	x86_64|amd64) arch=amd64 ;;
	arm64|aarch64)
		warn "Ikenga does not yet ship an $uname_m build."
		warn "Current releases support x86_64 only."
		echo
		hint "Track arm64 progress: https://github.com/$REPO/issues"
		hint "Or build from source:  git clone https://github.com/$REPO"
		exit 1
		;;
	*) fail "Unsupported architecture: $uname_m" ;;
esac

# ─── resolve release tag ───────────────────────────────────────────────────
if [ "$VERSION" = "latest" ]; then
	api="https://api.github.com/repos/$REPO/releases/latest"
	tag="$(curl -fsSL "$api" 2>/dev/null | grep -m1 '"tag_name"' | cut -d'"' -f4 || true)"

	if [ -z "$tag" ]; then
		warn "No published release found for $REPO."
		echo
		echo "Ikenga has not yet cut a public release. The download endpoints"
		echo "will become live the first time a release is published on GitHub."
		echo
		hint "Track releases: https://github.com/$REPO/releases"
		hint "Or pin a draft tag explicitly: IKENGA_VERSION=v0.0.4 sh install.sh"
		exit 1
	fi
else
	tag="$VERSION"
fi

ver="${tag#v}"
say "Ikenga $tag — $os/$arch"

# ─── download helper ───────────────────────────────────────────────────────
tmp="$(mktemp -d 2>/dev/null || mktemp -d -t ikenga)"
trap 'rm -rf "$tmp"' EXIT INT TERM

download() {
	url="$1"; out="$2"
	if ! curl -fSL --progress-bar -o "$out" "$url"; then
		fail "Download failed: $url"
	fi
}

# ─── platform install ──────────────────────────────────────────────────────
if [ "$os" = "darwin" ]; then
	asset="Ikenga_${ver}_x64.dmg"
	url="https://github.com/$REPO/releases/download/$tag/$asset"
	echo "→ Downloading $asset"
	download "$url" "$tmp/$asset"

	echo "→ Mounting"
	mount_out="$(hdiutil attach "$tmp/$asset" -nobrowse -readonly -mountrandom "$tmp" 2>&1)"
	vol="$(printf '%s\n' "$mount_out" | awk '/\/Volumes\// || /'"$tmp"'/ {for(i=1;i<=NF;i++) if($i ~ /^\//) print $i}' | tail -1)"
	[ -d "$vol" ] || fail "Could not determine mount point for $asset"

	app="$(find "$vol" -maxdepth 2 -name '*.app' -print -quit)"
	[ -n "$app" ] || { hdiutil detach "$vol" -quiet 2>/dev/null || true; fail "No .app found inside DMG"; }

	dest_dir="/Applications"
	dest="$dest_dir/$(basename "$app")"

	if [ ! -w "$dest_dir" ]; then
		warn "$dest_dir is not writable by this user."
		warn "Drag $(basename "$app") to /Applications manually, then close this window."
		echo
		open "$vol" || true
		# Detach later — give user a moment.
		sleep 30
		hdiutil detach "$vol" -quiet 2>/dev/null || true
		exit 1
	fi

	[ -d "$dest" ] && { echo "→ Replacing existing $dest"; rm -rf "$dest"; }
	echo "→ Installing to $dest"
	cp -R "$app" "$dest_dir/"
	hdiutil detach "$vol" -quiet 2>/dev/null || true

	# Remove Gatekeeper quarantine on the freshly-copied app (best-effort).
	xattr -dr com.apple.quarantine "$dest" 2>/dev/null || true

	echo
	say "Ikenga is installed."
	echo "Launch with: open -a Ikenga"
fi

if [ "$os" = "linux" ]; then
	asset="Ikenga_${ver}_amd64.AppImage"
	url="https://github.com/$REPO/releases/download/$tag/$asset"

	dir="${IKENGA_INSTALL_DIR:-$HOME/.local/bin}"
	bin="$dir/ikenga"

	echo "→ Downloading $asset"
	mkdir -p "$dir"
	download "$url" "$bin"
	chmod +x "$bin"

	echo
	say "Ikenga is installed at $bin"

	case ":${PATH:-}:" in
		*":$dir:"*) echo "Launch with: ikenga" ;;
		*)
			hint "Note: $dir is not on your PATH."
			hint "Add it (bash/zsh):"
			hint "  echo 'export PATH=\"$dir:\$PATH\"' >> ~/.profile"
			echo
			echo "Or launch directly: $bin"
			;;
	esac

	if command -v dpkg >/dev/null 2>&1; then
		echo
		hint "Prefer a system-wide .deb install? Run:"
		hint "  curl -fSL -o /tmp/ikenga.deb https://github.com/$REPO/releases/download/$tag/Ikenga_${ver}_amd64.deb"
		hint "  sudo apt-get install -y /tmp/ikenga.deb"
	fi
fi
