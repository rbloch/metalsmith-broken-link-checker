const urijs = require("urijs")
const path = require("path")

module.exports = ({
  files,
  filesToTargets,
  fileExists,
  fileHasTarget,
  link: {
    target,
    type,
    filename,
  },
  options,
}) => {
  // Allow anchors before checking for a missing href
  if (options.allowAnchors && type === "anchor") {
    return false
  }

  // Missing href is always broken
  if ((target == null)) {
    return true
  }

  const uri = urijs(target)

  // Allow anything matching the options.allowRegex regex
  if ((options.allowRegex != null) && options.allowRegex.exec(target)) {
    return false
  }

  // Empty link is always broken
  if (target === "") {
    return true
  }

  // Allow link to '#'
  if (target === "#") {
    return false
  }

  // Automatically accept all external links (could change later)
  if (uri.hostname()) {
    return false
  }

  // Ignore mailto and other non-http/https links
  if (uri.protocol() && !["http", "https"].includes(uri.protocol)) {
    return false
  }

  const fragment = uri.fragment()

  // Allow links to elements on the same page
  if (fragment && !uri.path()) {
      return options.checkAnchors && !fileHasTarget(filesToTargets, filename, fragment)
  }

  // Add baseURL in here so that the linkPath resolves to it in the case of
  // a relative link
  if (options.baseURL) {
    filename = path.join(options.baseURL, filename)
  }

  // Need to transform uri.path() into something Metalsmith can recognise
  const unixFilename = filename.replace(/\\/g, "/")
  let linkPath = uri.absoluteTo(unixFilename).path()

  // If baseURL then all internal links should be prefixed by it.
  if (options.baseURL) {

    // If the linkPath does not start with the baseURL then it is broken
    if (linkPath.indexOf(options.baseURL) !== 0) {
      return true
    }

    // Strip the baseURL out for checking whether the file exists in metalsmith
    linkPath = linkPath.replace(options.baseURL, "")

    // Fix bug where you were linking directly to the linkPath
    if (linkPath === "") {
      linkPath = "/"
    }
  }

  // Special case for link to root
  if (linkPath === "/") {
    return !fileExists(files, "index.html") || (options.checkAnchors && !fileHasTarget(filesToTargets, "index.html", fragment))
  }

  // Allow links to directories with a trailing slash
  if (linkPath.slice(-1) === "/") {
    linkPath += "index.html"
  }

  // Allow links to directories without a trailing slash with allowRedirects option
  if (options.allowRedirects && fileExists(files, linkPath + "/index.html")) {
    return false
  }

  return !fileExists(files, linkPath) || (options.checkAnchors && !fileHasTarget(filesToTargets, linkPath, fragment))
}
