# An Online Java IDE designed for multiple users

# How to use

Please install Node.js and Java

Run 'dependencies.bat'

Go to your 'node-modules' folder and find 'monaco-editor' copy that folder to the static folder

Fill out the .env file with your permitted users (comma seperated)

(this is based off of the value before the @ in an email address, for example to permit user@domain.com add user to the allowed users value)

Change the RegEx for the email address entry field under 'registerSite.html' to fit your email format.

Run start.bat

Open 'localhost' in any web browser and your local ip for any other machine on the same network

To add a file to all users, add the file to the 'toSpread' folder then edit the 'filename' variable in 'spread.js' (omit the .java extension), then run the program.

'spread.js' will pass over users who already have a file with that name, be sure to add the file manually to those folders.