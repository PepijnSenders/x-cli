class Browse < Formula
  desc "Scrape any webpage to markdown using your browser session"
  homepage "https://github.com/PepijnSenders/browse-cli"
  version "1.0.3"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/PepijnSenders/browse-cli/releases/download/v#{version}/browse-darwin-arm64.tar.gz"
      # sha256 will be auto-filled after release
      sha256 "PLACEHOLDER"
    end
    on_intel do
      url "https://github.com/PepijnSenders/browse-cli/releases/download/v#{version}/browse-darwin-x64.tar.gz"
      sha256 "PLACEHOLDER"
    end
  end

  on_linux do
    on_intel do
      url "https://github.com/PepijnSenders/browse-cli/releases/download/v#{version}/browse-linux-x64.tar.gz"
      sha256 "PLACEHOLDER"
    end
  end

  def install
    # The tarball extracts to browse-{platform}/
    # Find the binary and extension
    bin.install Dir["browse-*/browse"].first => "browse"

    # Install extension for Chrome
    pkgshare.install Dir["browse-*/extension"].first => "extension"
    pkgshare.install Dir["browse-*/skills"].first => "skills"
  end

  def caveats
    <<~EOS
      To use browse, install the Chrome extension:

      1. Open chrome://extensions in Chrome
      2. Enable "Developer mode" (top right)
      3. Click "Load unpacked"
      4. Select: #{pkgshare}/extension

      Then start the daemon:
        browse init

      And scrape any page:
        browse https://example.com
    EOS
  end

  test do
    assert_match "browse", shell_output("#{bin}/browse --help")
    assert_match version.to_s, shell_output("#{bin}/browse --version")
  end
end
