const key = "AIzaSyA1K6WBNouTUucTtgrCKepS5h-n6Sc_fKU";
fetch("https://www.googleapis.com/youtube/v3/search?part=snippet&q=The+Weeknd&type=video&videoCategoryId=10&maxResults=5&key=" + key)
  .then(res => res.json())
  .then(data => {
    if (data.items) {
      console.log("SUCCESS! Found", data.items.length, "items");
      console.log("First item:", data.items[0].snippet.title);
    } else {
      console.log("API returned error or no items:", JSON.stringify(data));
    }
  })
  .catch(console.error);
