# Mach1 demos page deployment

# Add your s3 bucket name
s3_bucket_name = 
# Add your s3 profile 
s3_profile = 

# getting OS type
ifeq ($(OS),Windows_NT)
	detected_OS := Windows
else
	detected_OS := $(shell uname)
endif

install: 
	# install all deps

download-audiofiles:
	aws s3 cp s3://Bucket/Folder LocalFolder --recursive

# TODO: improve caching when scaled up, apply cache age 0 only to files that change often
deploy:
	# deploys build to public AWS bucket
	# NOTE: relies on `s3_profile` with keys in `~/.aws/credentials`
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type text/html --cache-control no-cache --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.html" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type text/plain --cache-control no-cache --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.txt" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type text/css --cache-control no-cache --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.css" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type application/xhtml+xml --cache-control no-cache --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.xml" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type application/font-woff --cache-control no-cache --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.woff" --include "*.woff2" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --cache-control no-cache --acl public-read --metadata-directive REPLACE --include "*" --exclude ".git*" --exclude ".DS_Store" --exclude "Makefile" --exclude "*.html" --exclude "*.woff" --exclude "*.woff2" --exclude "*.txt" --exclude "*.css" --exclude "*.xml" --exclude "*.svg" --exclude "*.jpg" --exclude "*.tiff" --exclude "*.png" --exclude "*.aif" --exclude "*.aiff" --exclude "*.ogg" --exclude "*.mp3" --exclude "*.wav" --exclude "*.DS_Store" --profile $(s3_profile)

assets:
	# deploys only the assets for content to avoid large uploads
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type image/svg+xml --cache-control no-cache --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.svg" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type image/png --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.png" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type image/jpeg --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.jpg" --include "*.jpeg" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type image/tiff --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.tiff" --include "*.tif" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type audio/aiff --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.aif" --include "*.aiff" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type audio/mpeg --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.mp3" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type audio/wav --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.wav" --profile $(s3_profile)
	aws s3 sync ./ s3://$(s3_bucket_name) --content-type audio/ogg --acl public-read --metadata-directive REPLACE --exclude "*" --include "*.ogg" --profile $(s3_profile)
