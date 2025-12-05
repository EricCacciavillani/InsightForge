"""
Profile Manager for Deep Research Lab.

Handles CRUD operations for research profiles, with JSON file persistence.
"""

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class Constraints:
    """Hardware and budget constraints for a research profile."""
    latency_ms: int = 180
    budget_usd: int = 5000
    vram_gb: int = 20
    team_size: int = 1


@dataclass
class ResearchConfig:
    """Research depth and pipeline configuration."""
    depth_preset: str = "standard"  # quick, standard, deep
    max_cycles: int = 2
    rounds_per_cycle: int = 3
    num_reviewers: int = 3
    num_critics: int = 2
    enable_deep_search: bool = True
    enable_meta_debate: bool = True


@dataclass
class Profile:
    """A research project profile containing context, constraints, and config."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Untitled Profile"
    description: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    context: str = ""
    constraints: Constraints = field(default_factory=Constraints)
    research_config: ResearchConfig = field(default_factory=ResearchConfig)
    model_routing: dict = field(default_factory=dict)
    is_default: bool = False

    def to_dict(self) -> dict:
        """Convert profile to dictionary for JSON serialization."""
        data = asdict(self)
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Profile":
        """Create a Profile from a dictionary."""
        # Handle nested dataclasses
        if "constraints" in data and isinstance(data["constraints"], dict):
            data["constraints"] = Constraints(**data["constraints"])
        if "research_config" in data and isinstance(data["research_config"], dict):
            data["research_config"] = ResearchConfig(**data["research_config"])
        return cls(**data)


class ProfileManager:
    """
    Manages research profiles with CRUD operations and JSON persistence.
    
    Profiles are stored as individual JSON files in the profiles directory.
    """

    def __init__(self, profiles_dir: Optional[Path] = None):
        """
        Initialize the ProfileManager.
        
        Args:
            profiles_dir: Directory to store profile JSON files.
                         Defaults to 'profiles/' in the backend directory.
        """
        if profiles_dir is None:
            profiles_dir = Path(__file__).resolve().parent.parent.parent / "profiles"
        
        self.profiles_dir = Path(profiles_dir)
        self.profiles_dir.mkdir(parents=True, exist_ok=True)
        
        # Track active profile ID
        self._active_profile_id: Optional[str] = None
        self._load_active_profile_id()

    def _get_profile_path(self, profile_id: str) -> Path:
        """Get the file path for a profile."""
        return self.profiles_dir / f"{profile_id}.json"

    def _get_meta_path(self) -> Path:
        """Get the path to the metadata file (stores active profile ID)."""
        return self.profiles_dir / "_meta.json"

    def _load_active_profile_id(self) -> None:
        """Load the active profile ID from metadata file."""
        meta_path = self._get_meta_path()
        if meta_path.exists():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    self._active_profile_id = meta.get("active_profile_id")
            except (json.JSONDecodeError, IOError):
                self._active_profile_id = None

    def _save_active_profile_id(self) -> None:
        """Save the active profile ID to metadata file."""
        meta_path = self._get_meta_path()
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({"active_profile_id": self._active_profile_id}, f)

    def create(self, profile: Profile) -> Profile:
        """
        Create a new profile.
        
        Args:
            profile: The Profile object to create.
            
        Returns:
            The created Profile with assigned ID.
            
        Raises:
            ValueError: If a profile with the same ID already exists.
        """
        profile_path = self._get_profile_path(profile.id)
        if profile_path.exists():
            raise ValueError(f"Profile with ID '{profile.id}' already exists")
        
        profile.created_at = datetime.utcnow().isoformat()
        profile.updated_at = profile.created_at
        
        with open(profile_path, "w", encoding="utf-8") as f:
            json.dump(profile.to_dict(), f, indent=2)
        
        return profile

    def get(self, profile_id: str) -> Optional[Profile]:
        """
        Get a profile by ID.
        
        Args:
            profile_id: The ID of the profile to retrieve.
            
        Returns:
            The Profile if found, None otherwise.
        """
        profile_path = self._get_profile_path(profile_id)
        if not profile_path.exists():
            return None
        
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return Profile.from_dict(data)
        except (json.JSONDecodeError, IOError):
            return None

    def update(self, profile: Profile) -> Profile:
        """
        Update an existing profile.
        
        Args:
            profile: The Profile object with updated data.
            
        Returns:
            The updated Profile.
            
        Raises:
            ValueError: If the profile doesn't exist.
        """
        profile_path = self._get_profile_path(profile.id)
        if not profile_path.exists():
            raise ValueError(f"Profile with ID '{profile.id}' not found")
        
        profile.updated_at = datetime.utcnow().isoformat()
        
        with open(profile_path, "w", encoding="utf-8") as f:
            json.dump(profile.to_dict(), f, indent=2)
        
        return profile

    def delete(self, profile_id: str) -> bool:
        """
        Delete a profile by ID.
        
        Args:
            profile_id: The ID of the profile to delete.
            
        Returns:
            True if deleted, False if not found.
        """
        profile_path = self._get_profile_path(profile_id)
        if not profile_path.exists():
            return False
        
        profile_path.unlink()
        
        # Clear active profile if it was deleted
        if self._active_profile_id == profile_id:
            self._active_profile_id = None
            self._save_active_profile_id()
        
        return True

    def list_all(self) -> list[Profile]:
        """
        List all profiles.
        
        Returns:
            List of all Profile objects.
        """
        profiles = []
        for path in self.profiles_dir.glob("*.json"):
            if path.name.startswith("_"):
                continue  # Skip metadata files
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    profiles.append(Profile.from_dict(data))
            except (json.JSONDecodeError, IOError):
                continue
        
        return sorted(profiles, key=lambda p: p.name)

    def get_active(self) -> Optional[Profile]:
        """
        Get the currently active profile.
        
        Returns:
            The active Profile if set, None otherwise.
        """
        if self._active_profile_id:
            return self.get(self._active_profile_id)
        return None

    def set_active(self, profile_id: str) -> Profile:
        """
        Set the active profile.
        
        Args:
            profile_id: The ID of the profile to make active.
            
        Returns:
            The activated Profile.
            
        Raises:
            ValueError: If the profile doesn't exist.
        """
        profile = self.get(profile_id)
        if profile is None:
            raise ValueError(f"Profile with ID '{profile_id}' not found")
        
        self._active_profile_id = profile_id
        self._save_active_profile_id()
        
        return profile
