import sys
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_admin_system():
    print("=== Testing Admin & Social Publication System ===")

    # 1. Test List Admin Articles
    res = client.get("/admin/articles")
    assert res.status_code == 200, f"List articles failed: {res.text}"
    articles = res.json()
    print(f"[OK] Fetched {len(articles)} admin articles.")
    assert len(articles) > 0, "No articles found in DB"
    sample_article = articles[0]
    art_id = sample_article["id"]
    print(f"Sample article: ID={art_id}, Title='{sample_article['title'][:40]}...', Status='{sample_article.get('status')}'")

    # 2. Test Update Article Status
    res = client.patch(f"/admin/articles/{art_id}/status", json={"status": "valide"})
    assert res.status_code == 200, f"Update article status failed: {res.text}"
    print(f"[OK] Updated article {art_id} status to 'valide'.")

    # 3. Test Modify Article Details
    res = client.patch(f"/admin/articles/{art_id}", json={
        "title": sample_article["title"] + " [Validated]",
        "category": sample_article.get("category") or "tech"
    })
    assert res.status_code == 200, f"Modify article failed: {res.text}"
    print(f"[OK] Modified article {art_id} details successfully.")

    # 4. Test Generate LinkedIn Post
    res = client.post("/admin/publications/generate", json={
        "article_id": art_id,
        "platform": "linkedin"
    })
    assert res.status_code == 200, f"Generate LinkedIn post failed: {res.text}"
    linkedin_pub = res.json()
    linkedin_id = linkedin_pub["id"]
    print(f"[OK] Generated LinkedIn post ID={linkedin_id}, Status='{linkedin_pub['status']}'")
    assert linkedin_pub["platform"] == "linkedin"
    assert "content" in linkedin_pub and len(linkedin_pub["content"]) > 10

    # 5. Test Generate Instagram Post
    res = client.post("/admin/publications/generate", json={
        "article_id": art_id,
        "platform": "instagram"
    })
    assert res.status_code == 200, f"Generate Instagram post failed: {res.text}"
    insta_pub = res.json()
    insta_id = insta_pub["id"]
    print(f"[OK] Generated Instagram post ID={insta_id}, Status='{insta_pub['status']}'")
    assert insta_pub["platform"] == "instagram"

    # 6. Test List Publications
    res = client.get("/admin/publications")
    assert res.status_code == 200, f"List publications failed: {res.text}"
    pubs = res.json()
    print(f"[OK] Listed {len(pubs)} total publications.")

    # 7. Test Status Workflow (a_valider -> valide -> publie / refuse)
    # Approve LinkedIn post
    res = client.patch(f"/admin/publications/{linkedin_id}/status", json={"status": "valide"})
    assert res.status_code == 200
    print(f"[OK] Updated LinkedIn post status to 'valide'.")

    # Mark Instagram post as published
    res = client.patch(f"/admin/publications/{insta_id}/status", json={"status": "publie"})
    assert res.status_code == 200
    print(f"[OK] Updated Instagram post status to 'publie'.")

    # 8. Test Regenerate Post Text & AI Image
    res = client.post(f"/admin/publications/{linkedin_id}/regenerate", json={"target": "both"})
    assert res.status_code == 200
    regen_pub = res.json()
    print(f"[OK] Regenerated LinkedIn post text & visual image URL successfully.")

    # 9. Test AI Image Generation Endpoint
    res = client.post("/admin/generate-image", json={"topic": "Quantum Computing AI"})
    assert res.status_code == 200
    img_res = res.json()
    print(f"[OK] Generated topic image URL: {img_res['image_url'][:60]}...")

    print("\nALL ADMIN & SOCIAL PUBLICATION SYSTEM TESTS PASSED PERFECTLY!")

if __name__ == "__main__":
    test_admin_system()
