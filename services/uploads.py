"""Image uploads for admin-managed content (story avatars and photo albums).

Every file is decoded with Pillow before it is kept, so anything that is not a
real image is rejected regardless of its extension. Images are re-encoded,
EXIF-rotated and downscaled, which also strips metadata such as GPS location
from participants' phone photos.
"""
import os
import secrets

from PIL import Image, ImageOps, UnidentifiedImageError

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_PIXELS = 40_000_000  # guards against decompression bombs

AVATAR_SIZE = 480
PHOTO_MAX_EDGE = 2000


class UploadError(ValueError):
    pass


def _upload_root(static_folder, *parts):
    path = os.path.join(static_folder, 'uploads', *parts)
    os.makedirs(path, exist_ok=True)
    return path


def _open_image(file_storage):
    filename = file_storage.filename or ''
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise UploadError(f'"{filename}" is not a supported image (use JPG, PNG or WebP).')

    try:
        img = Image.open(file_storage.stream)
        if img.width * img.height > MAX_PIXELS:
            raise UploadError(f'"{filename}" is too large.')
        img.load()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise UploadError(f'"{filename}" could not be read as an image.')

    img = ImageOps.exif_transpose(img)
    if img.mode not in ('RGB', 'RGBA'):
        img = img.convert('RGB')
    return img


def _save(img, static_folder, subdir, static_url_path):
    name = f'{secrets.token_hex(12)}.webp'
    folder = _upload_root(static_folder, *subdir)
    img.save(os.path.join(folder, name), 'WEBP', quality=84, method=4)
    return '/'.join([static_url_path, 'uploads', *subdir, name])


def save_avatar(file_storage, static_folder, static_url_path='/static'):
    img = _open_image(file_storage)
    img = ImageOps.fit(img, (AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS, centering=(0.5, 0.4))
    return _save(img, static_folder, ['stories', 'avatars'], static_url_path)


def save_photo(file_storage, static_folder, static_url_path='/static', folder='stories', kind='photos'):
    img = _open_image(file_storage)
    img.thumbnail((PHOTO_MAX_EDGE, PHOTO_MAX_EDGE), Image.LANCZOS)
    return _save(img, static_folder, [folder, kind], static_url_path)


def delete_upload(url_path, static_folder, static_url_path='/static'):
    """Remove a file previously returned by save_*; ignores anything else."""
    prefix = f'{static_url_path}/uploads/'
    if not url_path or not url_path.startswith(prefix):
        return
    relative = url_path[len(static_url_path) + 1:]
    root = os.path.realpath(os.path.join(static_folder, 'uploads'))
    target = os.path.realpath(os.path.join(static_folder, relative))
    if target.startswith(root + os.sep) and os.path.isfile(target):
        try:
            os.remove(target)
        except OSError:
            # A leftover file is harmless; never fail the admin's save over it.
            pass
