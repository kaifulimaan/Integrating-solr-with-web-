from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import json
import uvicorn
from typing import Optional, List

app = FastAPI(title="Solr Search API")

# Add CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure your Solr connection
SOLR_URL = "http://localhost:8983/solr/kaifsCollection"  # Adjust based on your Solr setup

@app.get("/search/")
async def search(
    q: str = Query(None, description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    author: Optional[str] = Query(None, description="Filter by author"),
    published: Optional[bool] = Query(None, description="Filter by published status"),
    rows: int = Query(10, description="Number of results to return"),
    start: int = Query(0, description="Starting index")
):
    # Build the Solr query
    query_parts = []
    
    if q:
        query_parts.append(f"(title:{q}* OR author:{q}*)")
    else:
        query_parts.append("*:*")
        
    if category:
        query_parts.append(f"category:{category}")
    
    if author:
        query_parts.append(f"author:\"{author}\"")
        
    if published is not None:
        query_parts.append(f"published:{str(published).lower()}")
    
    query = " AND ".join(query_parts)
    
    # Make request to Solr
    params = {
        "q": query,
        "wt": "json",
        "rows": rows,
        "start": start,
    }
    
    response = requests.get(f"{SOLR_URL}/select", params=params)
    
    if response.status_code != 200:
        return {"error": "Failed to fetch results from Solr"}
    
    return response.json()

@app.get("/suggest/")
async def suggest(
    q: str = Query(..., description="Autocomplete prefix")
):
    # Simple autocomplete using Solr's prefix query
    if not q:
        return {"suggestions": []}
        
    params = {
        "q": f"title:{q}*",
        "wt": "json",
        "rows": 5,
        "fl": "title"
    }
    
    response = requests.get(f"{SOLR_URL}/select", params=params)
    
    if response.status_code != 200:
        return {"suggestions": []}
        
    results = response.json().get("response", {}).get("docs", [])
    suggestions = [doc.get("title") for doc in results]
    
    return {"suggestions": suggestions}

@app.get("/filters/")
async def get_filters():
    # Get available filter options
    categories = get_facet_values("category")
    authors = get_facet_values("author")
    
    return {
        "categories": categories,
        "authors": authors
    }

def get_facet_values(field):
    params = {
        "q": "*:*",
        "facet": "true",
        "facet.field": field,
        "facet.limit": -1,
        "rows": 0,
        "wt": "json"
    }
    
    response = requests.get(f"{SOLR_URL}/select", params=params)
    
    if response.status_code != 200:
        return []
        
    facet_data = response.json().get("facet_counts", {}).get("facet_fields", {}).get(field, [])
    
    # Facet data comes as [value1, count1, value2, count2, ...]
    # Transform to just the values
    values = [facet_data[i] for i in range(0, len(facet_data), 2)]
    
    return values

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)