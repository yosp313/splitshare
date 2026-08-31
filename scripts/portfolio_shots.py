"""Stage a realistic SplitShare bill and capture portfolio screenshots."""
import os
from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
OUT = "/home/cactusjoe/workspace/splitshare/portfolio"
os.makedirs(OUT, exist_ok=True)

ITEMS = [
    ("Mixed Grill Platter", 2, 385.00),
    ("Hawawshi Sandwich", 2, 95.00),
    ("Fresh Lemonade", 4, 45.00),
    ("Om Ali Dessert", 2, 75.00),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900},
                              device_scale_factor=2)
    page = ctx.new_page()
    page.goto(BASE, wait_until="networkidle")
    page.wait_for_timeout(1200)

    # --- Shot 1: landing hero ---
    page.screenshot(path=f"{OUT}/splitshare-landing.png", full_page=False)

    # --- Create host room ---
    page.get_by_placeholder("e.g. Mina").fill("Youssef")
    page.get_by_placeholder("https://ipn.eg/S/...").fill("https://ipn.eg/S/youssef@instapay")
    page.click("text=Create my room")
    page.wait_for_selector("button.manual-receipt", timeout=15000)
    page.wait_for_timeout(600)

    # --- Manual receipt: empty at first, so add one row per item ---
    page.click("button.manual-receipt")
    page.wait_for_selector("button.add-item", timeout=10000)
    for name, qty, price in ITEMS:
        page.click("button.add-item")
        page.wait_for_timeout(250)
        row = page.locator(".item-row").last
        row.locator(".item-name input").fill(name)
        row.locator(".item-qty input").fill(str(qty))
        row.locator(".item-price input").fill(f"{price:.2f}")

    # Tax + service (fee-grid inputs)
    fee_inputs = page.locator(".fee-grid .money-input input")
    fee_inputs.nth(0).fill("142.50")   # tax (14% VAT)
    fee_inputs.nth(1).fill("203.60")   # service (~12.5%)
    page.wait_for_timeout(500)

    # --- Add two friends ---
    for friend in ("Omar", "Salma"):
        page.click("button.icon-button[aria-label='Add friend']")
        page.fill("input[placeholder=\"Friend's name\"]", friend)
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)

    # --- Claim alternating items as host ---
    claims = page.locator("button.claim-item")
    n = claims.count()
    for i in range(n):
        if i % 2 == 0:
            claims.nth(i).click()
            page.wait_for_timeout(150)
    page.wait_for_timeout(1200)  # shares + sync settle

    # --- Shot 2: staged room ---
    page.screenshot(path=f"{OUT}/splitshare-room.png", full_page=True)
    body = page.inner_text("body")
    print("---- ROOM TEXT (first 1000) ----")
    print(body[:1000])
    browser.close()

for f in sorted(os.listdir(OUT)):
    sz = os.path.getsize(os.path.join(OUT, f)) // 1024
    print(f"{f}: {sz} KB")
