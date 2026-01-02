import { Command } from "commander";

/**
 * Generate bash completion script
 */
function generateBashCompletion(): string {
  return `# x-cli bash completion
_x_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="auth me user post timeline search like unlike repost unrepost bookmark follow unfollow following followers block unblock blocks mute unmute mutes list lists dm space spaces media grok config completion"

    local auth_commands="login logout status refresh"
    local post_commands="create get delete reply quote"
    local timeline_commands="home user mentions"
    local bookmark_commands="add list remove"
    local list_commands="create get update delete timeline members add remove follow unfollow pin unpin"
    local lists_commands="owned followed pinned"
    local dm_commands="list view conversation send group delete"
    local space_commands="get search buyers"
    local media_commands="upload status wait"
    local grok_commands="summarize analyze draft reply ask"
    local config_commands="get set list reset"
    local completion_commands="bash zsh fish"

    case \${cword} in
        1)
            COMPREPLY=( \$(compgen -W "\${commands}" -- "\${cur}") )
            return 0
            ;;
        2)
            case \${prev} in
                auth)
                    COMPREPLY=( \$(compgen -W "\${auth_commands}" -- "\${cur}") )
                    ;;
                post)
                    COMPREPLY=( \$(compgen -W "\${post_commands}" -- "\${cur}") )
                    ;;
                timeline)
                    COMPREPLY=( \$(compgen -W "\${timeline_commands}" -- "\${cur}") )
                    ;;
                bookmark)
                    COMPREPLY=( \$(compgen -W "\${bookmark_commands}" -- "\${cur}") )
                    ;;
                list)
                    COMPREPLY=( \$(compgen -W "\${list_commands}" -- "\${cur}") )
                    ;;
                lists)
                    COMPREPLY=( \$(compgen -W "\${lists_commands}" -- "\${cur}") )
                    ;;
                dm)
                    COMPREPLY=( \$(compgen -W "\${dm_commands}" -- "\${cur}") )
                    ;;
                space)
                    COMPREPLY=( \$(compgen -W "\${space_commands}" -- "\${cur}") )
                    ;;
                media)
                    COMPREPLY=( \$(compgen -W "\${media_commands}" -- "\${cur}") )
                    ;;
                grok)
                    COMPREPLY=( \$(compgen -W "\${grok_commands}" -- "\${cur}") )
                    ;;
                config)
                    COMPREPLY=( \$(compgen -W "\${config_commands}" -- "\${cur}") )
                    ;;
                completion)
                    COMPREPLY=( \$(compgen -W "\${completion_commands}" -- "\${cur}") )
                    ;;
            esac
            return 0
            ;;
    esac
}

complete -F _x_completions x
`;
}

/**
 * Generate zsh completion script
 */
function generateZshCompletion(): string {
  return `#compdef x

_x() {
    local -a commands
    commands=(
        'auth:Authentication commands'
        'me:Show current user'
        'user:Lookup user by username'
        'post:Post commands'
        'timeline:Timeline commands'
        'search:Search posts'
        'like:Like a post'
        'unlike:Unlike a post'
        'repost:Repost a post'
        'unrepost:Remove repost'
        'bookmark:Bookmark commands'
        'follow:Follow a user'
        'unfollow:Unfollow a user'
        'following:List following'
        'followers:List followers'
        'block:Block a user'
        'unblock:Unblock a user'
        'blocks:List blocked users'
        'mute:Mute a user'
        'unmute:Unmute a user'
        'mutes:List muted users'
        'list:List commands'
        'lists:Your lists'
        'dm:Direct message commands'
        'space:Space commands'
        'spaces:User spaces'
        'media:Media commands'
        'grok:AI-powered features'
        'config:Configuration commands'
        'completion:Generate shell completions'
    )

    local -a auth_commands
    auth_commands=(
        'login:Start OAuth flow'
        'logout:Clear credentials'
        'status:Show current user'
        'refresh:Refresh token'
    )

    local -a post_commands
    post_commands=(
        'create:Create a post'
        'get:Get post by ID'
        'delete:Delete a post'
        'reply:Reply to a post'
        'quote:Quote a post'
    )

    local -a timeline_commands
    timeline_commands=(
        'home:Home timeline'
        'user:User timeline'
        'mentions:Mentions timeline'
    )

    local -a bookmark_commands
    bookmark_commands=(
        'add:Add bookmark'
        'list:List bookmarks'
        'remove:Remove bookmark'
    )

    local -a list_commands
    list_commands=(
        'create:Create list'
        'get:Get list'
        'update:Update list'
        'delete:Delete list'
        'timeline:List timeline'
        'members:List members'
        'add:Add member'
        'remove:Remove member'
        'follow:Follow list'
        'unfollow:Unfollow list'
        'pin:Pin list'
        'unpin:Unpin list'
    )

    local -a dm_commands
    dm_commands=(
        'list:List conversations'
        'view:View conversation'
        'conversation:View by ID'
        'send:Send message'
        'group:Create group DM'
        'delete:Delete message'
    )

    local -a space_commands
    space_commands=(
        'get:Get space details'
        'search:Search spaces'
        'buyers:Get space buyers'
    )

    local -a media_commands
    media_commands=(
        'upload:Upload media'
        'status:Check status'
        'wait:Wait for processing'
    )

    local -a grok_commands
    grok_commands=(
        'summarize:Summarize content'
        'analyze:Analyze post'
        'draft:Draft a post'
        'reply:Suggest replies'
        'ask:Ask about timeline'
    )

    local -a config_commands
    config_commands=(
        'get:Get config value'
        'set:Set config value'
        'list:List all config'
        'reset:Reset to defaults'
    )

    local -a completion_commands
    completion_commands=(
        'bash:Generate bash completions'
        'zsh:Generate zsh completions'
        'fish:Generate fish completions'
    )

    _arguments -C \\
        '1: :->command' \\
        '2: :->subcommand' \\
        '*::arg:->args'

    case "$state" in
        command)
            _describe -t commands 'x commands' commands
            ;;
        subcommand)
            case "$words[1]" in
                auth)
                    _describe -t auth_commands 'auth commands' auth_commands
                    ;;
                post)
                    _describe -t post_commands 'post commands' post_commands
                    ;;
                timeline)
                    _describe -t timeline_commands 'timeline commands' timeline_commands
                    ;;
                bookmark)
                    _describe -t bookmark_commands 'bookmark commands' bookmark_commands
                    ;;
                list)
                    _describe -t list_commands 'list commands' list_commands
                    ;;
                dm)
                    _describe -t dm_commands 'dm commands' dm_commands
                    ;;
                space)
                    _describe -t space_commands 'space commands' space_commands
                    ;;
                media)
                    _describe -t media_commands 'media commands' media_commands
                    ;;
                grok)
                    _describe -t grok_commands 'grok commands' grok_commands
                    ;;
                config)
                    _describe -t config_commands 'config commands' config_commands
                    ;;
                completion)
                    _describe -t completion_commands 'completion commands' completion_commands
                    ;;
            esac
            ;;
    esac
}

_x "$@"
`;
}

/**
 * Generate fish completion script
 */
function generateFishCompletion(): string {
  return `# x-cli fish completion

# Disable file completion by default
complete -c x -f

# Main commands
complete -c x -n "__fish_use_subcommand" -a "auth" -d "Authentication commands"
complete -c x -n "__fish_use_subcommand" -a "me" -d "Show current user"
complete -c x -n "__fish_use_subcommand" -a "user" -d "Lookup user by username"
complete -c x -n "__fish_use_subcommand" -a "post" -d "Post commands"
complete -c x -n "__fish_use_subcommand" -a "timeline" -d "Timeline commands"
complete -c x -n "__fish_use_subcommand" -a "search" -d "Search posts"
complete -c x -n "__fish_use_subcommand" -a "like" -d "Like a post"
complete -c x -n "__fish_use_subcommand" -a "unlike" -d "Unlike a post"
complete -c x -n "__fish_use_subcommand" -a "repost" -d "Repost a post"
complete -c x -n "__fish_use_subcommand" -a "unrepost" -d "Remove repost"
complete -c x -n "__fish_use_subcommand" -a "bookmark" -d "Bookmark commands"
complete -c x -n "__fish_use_subcommand" -a "follow" -d "Follow a user"
complete -c x -n "__fish_use_subcommand" -a "unfollow" -d "Unfollow a user"
complete -c x -n "__fish_use_subcommand" -a "following" -d "List following"
complete -c x -n "__fish_use_subcommand" -a "followers" -d "List followers"
complete -c x -n "__fish_use_subcommand" -a "block" -d "Block a user"
complete -c x -n "__fish_use_subcommand" -a "unblock" -d "Unblock a user"
complete -c x -n "__fish_use_subcommand" -a "blocks" -d "List blocked users"
complete -c x -n "__fish_use_subcommand" -a "mute" -d "Mute a user"
complete -c x -n "__fish_use_subcommand" -a "unmute" -d "Unmute a user"
complete -c x -n "__fish_use_subcommand" -a "mutes" -d "List muted users"
complete -c x -n "__fish_use_subcommand" -a "list" -d "List commands"
complete -c x -n "__fish_use_subcommand" -a "lists" -d "Your lists"
complete -c x -n "__fish_use_subcommand" -a "dm" -d "Direct message commands"
complete -c x -n "__fish_use_subcommand" -a "space" -d "Space commands"
complete -c x -n "__fish_use_subcommand" -a "spaces" -d "User spaces"
complete -c x -n "__fish_use_subcommand" -a "media" -d "Media commands"
complete -c x -n "__fish_use_subcommand" -a "grok" -d "AI-powered features"
complete -c x -n "__fish_use_subcommand" -a "config" -d "Configuration commands"
complete -c x -n "__fish_use_subcommand" -a "completion" -d "Generate shell completions"

# Auth subcommands
complete -c x -n "__fish_seen_subcommand_from auth" -a "login" -d "Start OAuth flow"
complete -c x -n "__fish_seen_subcommand_from auth" -a "logout" -d "Clear credentials"
complete -c x -n "__fish_seen_subcommand_from auth" -a "status" -d "Show current user"
complete -c x -n "__fish_seen_subcommand_from auth" -a "refresh" -d "Refresh token"

# Post subcommands
complete -c x -n "__fish_seen_subcommand_from post" -a "create" -d "Create a post"
complete -c x -n "__fish_seen_subcommand_from post" -a "get" -d "Get post by ID"
complete -c x -n "__fish_seen_subcommand_from post" -a "delete" -d "Delete a post"
complete -c x -n "__fish_seen_subcommand_from post" -a "reply" -d "Reply to a post"
complete -c x -n "__fish_seen_subcommand_from post" -a "quote" -d "Quote a post"

# Timeline subcommands
complete -c x -n "__fish_seen_subcommand_from timeline" -a "home" -d "Home timeline"
complete -c x -n "__fish_seen_subcommand_from timeline" -a "user" -d "User timeline"
complete -c x -n "__fish_seen_subcommand_from timeline" -a "mentions" -d "Mentions timeline"

# Bookmark subcommands
complete -c x -n "__fish_seen_subcommand_from bookmark" -a "add" -d "Add bookmark"
complete -c x -n "__fish_seen_subcommand_from bookmark" -a "list" -d "List bookmarks"
complete -c x -n "__fish_seen_subcommand_from bookmark" -a "remove" -d "Remove bookmark"

# List subcommands
complete -c x -n "__fish_seen_subcommand_from list" -a "create" -d "Create list"
complete -c x -n "__fish_seen_subcommand_from list" -a "get" -d "Get list"
complete -c x -n "__fish_seen_subcommand_from list" -a "update" -d "Update list"
complete -c x -n "__fish_seen_subcommand_from list" -a "delete" -d "Delete list"
complete -c x -n "__fish_seen_subcommand_from list" -a "timeline" -d "List timeline"
complete -c x -n "__fish_seen_subcommand_from list" -a "members" -d "List members"
complete -c x -n "__fish_seen_subcommand_from list" -a "add" -d "Add member"
complete -c x -n "__fish_seen_subcommand_from list" -a "remove" -d "Remove member"
complete -c x -n "__fish_seen_subcommand_from list" -a "follow" -d "Follow list"
complete -c x -n "__fish_seen_subcommand_from list" -a "unfollow" -d "Unfollow list"
complete -c x -n "__fish_seen_subcommand_from list" -a "pin" -d "Pin list"
complete -c x -n "__fish_seen_subcommand_from list" -a "unpin" -d "Unpin list"

# DM subcommands
complete -c x -n "__fish_seen_subcommand_from dm" -a "list" -d "List conversations"
complete -c x -n "__fish_seen_subcommand_from dm" -a "view" -d "View conversation"
complete -c x -n "__fish_seen_subcommand_from dm" -a "conversation" -d "View by ID"
complete -c x -n "__fish_seen_subcommand_from dm" -a "send" -d "Send message"
complete -c x -n "__fish_seen_subcommand_from dm" -a "group" -d "Create group DM"
complete -c x -n "__fish_seen_subcommand_from dm" -a "delete" -d "Delete message"

# Space subcommands
complete -c x -n "__fish_seen_subcommand_from space" -a "get" -d "Get space details"
complete -c x -n "__fish_seen_subcommand_from space" -a "search" -d "Search spaces"
complete -c x -n "__fish_seen_subcommand_from space" -a "buyers" -d "Get space buyers"

# Media subcommands
complete -c x -n "__fish_seen_subcommand_from media" -a "upload" -d "Upload media"
complete -c x -n "__fish_seen_subcommand_from media" -a "status" -d "Check status"
complete -c x -n "__fish_seen_subcommand_from media" -a "wait" -d "Wait for processing"

# Grok subcommands
complete -c x -n "__fish_seen_subcommand_from grok" -a "summarize" -d "Summarize content"
complete -c x -n "__fish_seen_subcommand_from grok" -a "analyze" -d "Analyze post"
complete -c x -n "__fish_seen_subcommand_from grok" -a "draft" -d "Draft a post"
complete -c x -n "__fish_seen_subcommand_from grok" -a "reply" -d "Suggest replies"
complete -c x -n "__fish_seen_subcommand_from grok" -a "ask" -d "Ask about timeline"

# Config subcommands
complete -c x -n "__fish_seen_subcommand_from config" -a "get" -d "Get config value"
complete -c x -n "__fish_seen_subcommand_from config" -a "set" -d "Set config value"
complete -c x -n "__fish_seen_subcommand_from config" -a "list" -d "List all config"
complete -c x -n "__fish_seen_subcommand_from config" -a "reset" -d "Reset to defaults"

# Completion subcommands
complete -c x -n "__fish_seen_subcommand_from completion" -a "bash" -d "Generate bash completions"
complete -c x -n "__fish_seen_subcommand_from completion" -a "zsh" -d "Generate zsh completions"
complete -c x -n "__fish_seen_subcommand_from completion" -a "fish" -d "Generate fish completions"

# Global options
complete -c x -s j -l json -d "Force JSON output"
complete -c x -s q -l quiet -d "Suppress non-essential output"
complete -c x -s v -l verbose -d "Debug information"
complete -c x -l no-color -d "Disable colors"
complete -c x -s h -l help -d "Show help"
complete -c x -l version -d "Show version"
`;
}

/**
 * Create completion command
 */
export function createCompletionCommand(): Command {
  const completion = new Command("completion")
    .description("Generate shell completion scripts");

  completion
    .command("bash")
    .description("Generate bash completion script")
    .action(() => {
      console.log(generateBashCompletion());
    });

  completion
    .command("zsh")
    .description("Generate zsh completion script")
    .action(() => {
      console.log(generateZshCompletion());
    });

  completion
    .command("fish")
    .description("Generate fish completion script")
    .action(() => {
      console.log(generateFishCompletion());
    });

  return completion;
}
