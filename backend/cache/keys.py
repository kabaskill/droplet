CACHE_VERSION = "v2"


def cache_key(name: str) -> str:
    return f"droplet:{name}:{CACHE_VERSION}"
