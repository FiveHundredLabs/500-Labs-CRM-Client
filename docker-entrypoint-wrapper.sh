#!/bin/sh
set -eu

if [ -z "${BACKEND_ORIGIN:-}" ]; then
    echo "BACKEND_ORIGIN is required. Set it to the backend origin only, for example https://api.example.com, not a path like /api/v1." >&2
    exit 1
fi

case "${BACKEND_ORIGIN}" in
    http://*|https://*) ;;
    *)
        echo "BACKEND_ORIGIN must start with http:// or https://." >&2
        exit 1
        ;;
esac

origin_without_scheme="${BACKEND_ORIGIN#http://}"
origin_without_scheme="${origin_without_scheme#https://}"

case "${origin_without_scheme}" in
    */*|*\?*|*#*)
        echo "BACKEND_ORIGIN must be the origin only with no path, query, fragment, or trailing slash. Nginx preserves the browser request path." >&2
        exit 1
        ;;
esac

case "${origin_without_scheme}" in
    *@*)
        echo "BACKEND_ORIGIN must not include embedded credentials." >&2
        exit 1
        ;;
esac

exec /docker-entrypoint.sh "$@"
