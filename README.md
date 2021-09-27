<a href="http://dev.mach1.tech"><img src="https://mach1-public.s3.amazonaws.com/assets/logo_big_b_l.png"></a>

# Mach1 Spatial Content Web Demos
[![Slack Channel](https://img.shields.io/badge/Slack-Join-purple)](https://join.slack.com/t/spatialaudio/shared_invite/enQtNjk0ODE4NjQ4NjExLWQ5YWUyNWQ4NWEwMDEwZmJiNmI5MzBhYjM3OTE3NTYxYzdjZDE2YTlhZDI4OGY0ZjdkNmM1NzgxNjI5OGU4ZWE)
[![YouTube Channel](https://img.shields.io/badge/YouTube-Subscribe-red)](https://www.youtube.com/channel/UCqoFv8OnTYjkwjHeo6JDUFg)

Various examples of web based spatial audio playback using the [Mach1 Spatial SDK and framework](https://github.com/Mach1Studios/m1-sdk). These examples are mostly derived from [this example](https://github.com/Mach1Studios/m1-web-spatialaudioplayer).

## Setup
- Install AWS CLI (for example: `brew install awscli`)
- Download the content audiofiles for the existing demos
- `sh ./download-audiofiles.sh`

## AWS S3 Deployment
There is an example Makefile setup here for deploying all the files and assets to the an aws s3 bucket for static hosting.

- Edit `s3_bucket_name` to the name of your s3 bucket
- Edit the `s3_profile` for the profile name of the credentials you prefer on your `~/.aws/credentials`
- `make deploy`
- `make assets`