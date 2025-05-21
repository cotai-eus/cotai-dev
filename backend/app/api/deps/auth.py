from typing import Optional
from fastapi import WebSocket, HTTPException, status, Depends, Query
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.api.deps.db import get_db
from app.api.deps.auth import oauth2_scheme
from app.models.user import User
from app.db.repositories import get_user_repository


async def get_current_user_ws(
    websocket: WebSocket,
    db: Session = Depends(get_db),
    token: Optional[str] = Query(None)
) -> User:
    """
    Dependency to get the current user from a WebSocket connection.
    Token can be provided as a query parameter in the WebSocket URL.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        # Extract token from query parameters
        token = websocket.query_params.get("token")
        
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise credentials_exception
        
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            raise credentials_exception
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise credentials_exception
        
    user_repository = get_user_repository(db)
    user = user_repository.get_by_id(user_id)
    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise credentials_exception
        
    if not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
        
    return user
