import json

datas = {}
with open("./document_page.json") as f:
    datas = json.load(f)

pages = datas["data"]["results"]
all_pages = {}
for each in pages:
    all_pages[each["id"]] = each
    for each_sub in each["subpages"]:
        all_pages[each_sub["id"]] = each_sub

for page_id, page_data in all_pages.items():
    print(f"Page ID: {page_id}")
    print(json.dumps(page_data, indent=4, ensure_ascii=False))
    print("---")


import re


def sanitize_filename(filename):
    # Replace characters that are not suitable for filenames with underscores
    # Also replace spaces with underscores
    sanitized = re.sub(r'[\\/*?:"<>|]|\s', "_", filename)
    return sanitized


for page_id, page_data in all_pages.items():
    if "title" in page_data and page_data["title"]:
        # Get the title and sanitize it for use as a filename
        filename = sanitize_filename(page_data["title"]) + ".json"

        # Write the page data to a JSON file
        with open(filename, "w", encoding="utf-8") as file:
            json.dump(page_data, file, indent=4, ensure_ascii=False)

        print(f"Saved page {page_id} to file: {filename}")
    else:
        print(f"Page {page_id} has no title, skipping file creation")
