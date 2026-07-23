import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

let s3Client: S3Client | null = null;
const bucketName = process.env.AWS_S3_BUCKET_NAME;

// Lazy initialize the SDK only when needed & credentials exist
function getS3Client(): S3Client | null {
  if (!s3Client) {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || "us-east-1";

    if (accessKey && secretKey && bucketName) {
      try {
        s3Client = new S3Client({
          region,
          credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
          },
        });
        console.log("☁️  AWS S3 storage driver initialized successfully.");
      } catch (err) {
        console.warn("⚠️  Failed to initialize AWS S3 storage client:", err);
        return null;
      }
    }
  }
  return s3Client;
}

/**
 * Persists an uploaded file either to AWS S3 or the fallback local container storage.
 * @param localFilePath The current temp location of the uploaded file on disk.
 * @param originalName Name of the file before upload, to determine extensions.
 * @param mimeType The content MIME metadata definition.
 */
export async function uploadToCloudBucket(
  localFilePath: string,
  originalName: string,
  mimeType: string
): Promise<string> {
  const client = getS3Client();
  const fileHashName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${path.extname(originalName)}`;

  if (client && bucketName) {
    try {
      const fileStream = fs.createReadStream(localFilePath);
      const uploadParams = {
        Bucket: bucketName,
        Key: `uploads/${fileHashName}`,
        Body: fileStream,
        ContentType: mimeType,
      };

      console.log(`☁️ Unifying binary assets: Uploading ${originalName} directly to S3 Bucket [${bucketName}]...`);
      await client.send(new PutObjectCommand(uploadParams));

      // Return AWS S3 Public Resource Identifier URL
      const region = process.env.AWS_REGION || "us-east-1";
      return `https://${bucketName}.s3.${region}.amazonaws.com/uploads/${fileHashName}`;
    } catch (err) {
      console.error("❌ High-availability S3 upload stream failed. Preserving file locally:", err);
    }
  }

  // S3 Fallback State: preserve file locally under /uploads in Node environment
  const targetLocalPath = path.join(process.cwd(), "uploads", fileHashName);
  
  if (localFilePath !== targetLocalPath) {
    await fs.promises.mkdir(path.dirname(targetLocalPath), { recursive: true });
    await fs.promises.rename(localFilePath, targetLocalPath);
  }

  console.log(`💾 Local Preservation: File successfully stored at relative link [ /uploads/${fileHashName} ]`);
  return `/uploads/${fileHashName}`;
}
