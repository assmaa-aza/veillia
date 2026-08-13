import os
import requests


class SocialPublishError(Exception):
    pass


def publish_to_platform(
    platform: str,
    content: str,
    image_url: str | None = None,
):
    platform = platform.lower().strip()

    if platform == "linkedin":
        return publish_to_linkedin(content, image_url)

    if platform == "instagram":
        return publish_to_instagram(content, image_url)

    raise SocialPublishError(
        f"Unsupported platform: {platform}"
    )


def publish_to_linkedin(
    content: str,
    image_url: str | None = None,
):
    access_token = os.getenv("LINKEDIN_ACCESS_TOKEN")
    author_urn = os.getenv("LINKEDIN_AUTHOR_URN")

    if not access_token:
        raise SocialPublishError(
            "LINKEDIN_ACCESS_TOKEN is missing."
        )

    if not author_urn:
        raise SocialPublishError(
            "LINKEDIN_AUTHOR_URN is missing."
        )

    url = "https://api.linkedin.com/rest/posts"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "Linkedin-Version": "202608",
    }

    data = {
        "author": author_urn,
        "commentary": content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }

    response = requests.post(
        url,
        headers=headers,
        json=data,
        timeout=30,
    )

    if response.status_code not in (200, 201):
        raise SocialPublishError(
            f"LinkedIn API error: "
            f"{response.status_code} - {response.text}"
        )

    return {
        "success": True,
        "platform": "linkedin",
        "post_id": response.headers.get("x-restli-id"),
    }


def publish_to_instagram(
    content: str,
    image_url: str | None = None,
):
    raise SocialPublishError(
        "Instagram publishing is not implemented yet."
    )